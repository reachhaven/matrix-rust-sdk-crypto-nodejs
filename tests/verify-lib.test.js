const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { verifyLib } = require("../verify-lib");

const LIBNAME = "matrix-sdk-crypto.linux-x64-gnu.node";
// SHA-256 of "abc", FIPS 180-2 appendix B.1
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe(verifyLib.name, () => {
    let dir;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), "matrix-sdk-crypto--"));
        await fs.writeFile(path.join(dir, LIBNAME), "abc");
        await fs.writeFile(path.join(dir, `${LIBNAME}.version`), "1.0.0");
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    const writeChecksums = (checksums) => fs.writeFile(path.join(dir, "checksums.json"), JSON.stringify(checksums));
    const files = async () => (await fs.readdir(dir)).sort();

    test("accepts a library that matches its checksum", async () => {
        await writeChecksums({ [LIBNAME]: ABC_SHA256 });

        expect(verifyLib(dir, LIBNAME)).toBe(true);
        expect(await files()).toEqual(["checksums.json", LIBNAME, `${LIBNAME}.version`]);
    });

    test("deletes a library that does not match its checksum", async () => {
        const expected = "0".repeat(64);
        await writeChecksums({ [LIBNAME]: expected });

        expect(() => verifyLib(dir, LIBNAME)).toThrow(`expected SHA-256 ${expected}, got ${ABC_SHA256}`);
        expect(await files()).toEqual(["checksums.json"]);
    });

    test("leaves a library unverified without a checksum file", async () => {
        expect(verifyLib(dir, LIBNAME)).toBe(false);
        expect(await files()).toEqual([LIBNAME, `${LIBNAME}.version`]);
    });

    test("deletes a library that the checksum file does not list", async () => {
        await writeChecksums({ "matrix-sdk-crypto.darwin-arm64.node": ABC_SHA256 });

        expect(() => verifyLib(dir, LIBNAME)).toThrow(`expected SHA-256 none, got ${ABC_SHA256}`);
        expect(await files()).toEqual(["checksums.json"]);
    });
});
