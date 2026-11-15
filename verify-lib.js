const { createHash } = require("crypto");
const { readFileSync, rmSync } = require("fs");
const path = require("path");

/**
 * Checks the prebuilt library `libname` in `dir` against the SHA-256 digest that `dir/checksums.json` lists for it.
 *
 * Returns `true` if the library matches and `false` if `dir` has no `checksums.json`. If the library does not match
 * the digest listed for it, or none is listed, deletes it and its `.version` file, then throws an error that names the
 * expected and actual digests.
 *
 * @param {string} dir
 * @param {string} libname
 * @returns {boolean}
 */
function verifyLib(dir, libname) {
    const checksums = readChecksums(dir);
    if (checksums === undefined) {
        return false;
    }

    const libPath = path.join(dir, libname);
    const expected = checksums?.[libname] ?? "none";
    const actual = createHash("sha256").update(readFileSync(libPath)).digest("hex");
    if (actual !== expected) {
        rmSync(libPath, { force: true });
        rmSync(`${libPath}.version`, { force: true });
        throw new Error(`Deleted ${libname}: expected SHA-256 ${expected}, got ${actual}`);
    }
    return true;
}

function readChecksums(dir) {
    try {
        return JSON.parse(readFileSync(path.join(dir, "checksums.json"), "utf-8"));
    } catch (ex) {
        if (ex.code === "ENOENT") {
            return undefined;
        }
        throw ex;
    }
}

module.exports = { verifyLib };
