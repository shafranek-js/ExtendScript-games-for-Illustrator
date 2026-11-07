// relax/lib/GamePersist.jsx
// key=value persistence in Folder.userData (no JSON in ExtendScript).
// ES3 only. Included via #include "lib/GamePersist.jsx".

// One save file per game, e.g. AI_Tetris_SaveData.txt
function getGameSaveFile(token) {
    return new File(Folder.userData.fsName + "/AI_" + token + "_SaveData.txt");
}

// Returns an object of key -> string value, or null when the file is missing.
function readKeyValueFile(file) {
    var map = {};
    try {
        if (!file.exists) return null;
        if (!file.open("r")) return null;
        var content = file.read();
        file.close();
        var rows = content.split(/\r?\n/);
        for (var i = 0; i < rows.length; i++) {
            var idx = rows[i].indexOf("=");
            if (idx > 0) {
                map[rows[i].substring(0, idx)] = rows[i].substring(idx + 1);
            }
        }
    } catch (e) {
        return null;
    }
    return map;
}

// pairs is an array of "key=value" strings. Returns true on success.
function writeKeyValueFile(file, pairs) {
    try {
        if (!file.open("w")) return false;
        file.write(pairs.join("\n"));
        file.close();
        return true;
    } catch (e) {
        return false;
    }
}
