/**
 * Created by titu on 10/17/16.
 */

const path = require('path');

module.exports = {
    userUploadsDir: path.resolve(__dirname, '../useruploads'),
    scrubOption: {
        mxOnly: false,
        mxStandard: false,
        botClickers: false,
        blackListed: false,
        spamTraps: false,
        hardBounces: false,
        litigators: false,
        complainers: false,
        unSubscribers: false,
        badWords: false,
        longEmails: false,
        syntaxErrors: false,
        seeds: false,
        fixedMisSpelledDomains: false,
        fixedLatinLetters: false,
        roles: false,
        duplicates: false,
        disposables: false,
        departmentals: false,
        foreignDomains: false,
        threatStrings: false,
        threatEndings: false
    },
    emailKeyNames: [
        'email',
        'emailaddress',
        'mail'
    ],
    latinCapitallerrers: [
        'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð', 'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Þ'
    ],
    latinCapitalLettersRegex: /[ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]/gi,
    latingEnglishMapper:
        {
            'À': 'a',
            'Á': 'a',
            'Â': 'a',
            'Ã': 'a',
            'Ä': 'a',
            'Å': 'a',
            'Æ': 'ae',
            'Ç': 'c',
            'È': 'e',
            'É': 'e',
            'Ê': 'e',
            'Ë': 'e',
            'Ì': 'i',
            'Í': 'i',
            'Î': 'i',
            'Ï': 'i',
            'Ð': 'eth',
            'Ñ': 'n',
            'Ò': 'o',
            'Ó': 'o',
            'Ô': 'o',
            'Õ': 'o',
            'Ö': 'o',
            'Ø': 'o',
            'Ù': 'u',
            'Ú': 'u',
            'Û': 'u',
            'Ü': 'u',
            'Ý': 'y',
            'Þ': 'thorn'
        }

};
