// relax/lib/GameI18n.jsx
// {0}-style placeholder substitution for the per-game dictionaries.
// ES3 only. Included via #include "lib/GameI18n.jsx".

// dict      - I18N[currentLang]
// fallback  - I18N.en
// key       - dictionary key
// args      - optional array of values for {0}, {1}, ...
function translateString(dict, fallbackDict, key, args) {
    var str = (dict && dict[key] !== undefined) ? dict[key]
        : ((fallbackDict && fallbackDict[key]) || key);

    if (args && args.length) {
        for (var i = 0; i < args.length; i++) {
            str = str.replace("{" + i + "}", String(args[i]));
        }
    }
    return str;
}
