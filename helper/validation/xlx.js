/**
 * Created by titu on 10/24/16.
 */
const promise = require('bluebird');
const fs = require('fs');
const csvHelper = require('./csv');
const _ = require('lodash');
const parse = require('csv-parse');
const babyparse = require('babyparse');
const XLSX = promise.promisifyAll(require('xlsx'));
const log = require('../log');

let readFromFileAndRemoveDupes = (filePath, header, scrubOptions) => {
    return new promise((resolve, reject) => {
        let workbook = null;
        let containsHeader = false;
        let parseData = null;

        try {
            log.info('MEMORY USE BEFORE FILE READ: ', process.memoryUsage());
            workbook = XLSX.readFile(filePath, {sheetRows: 0});
        }
        catch (e) {
            resolve([]);
        }
        if (_.isObject(header) && header.header === true) {
            containsHeader = true;
        }

        log.info('MEMORY USE: ', process.memoryUsage());

        if (containsHeader) {
            let jsonData = [];

            _.each(workbook.Sheets, function (value, key) {
                jsonData = _.concat(jsonData, XLSX.utils.sheet_to_json(workbook.Sheets[key]))
            });
            parseData = babyparse.unparse(jsonData);
            parseData = babyparse.parse(parseData, {
                header: containsHeader,
                complete: (results) => {
                    parseData = csvHelper.onParseComplete(results, header, scrubOptions.duplicates);
                    resolve(parseData);
                }
            });
        }
        else {
            let csvData = [];

            _.each(workbook.Sheets, function (value, key) {
                babyparse.parse(XLSX.utils.sheet_to_csv(workbook.Sheets[key]), {
                    header: containsHeader,
                    complete: (results) => {
                        csvData = _.concat(csvData, csvHelper.onParseComplete(results, header, scrubOptions.duplicates));
                    }
                });
            });

            parseData = csvData[0];

            for (let i = 1; i < csvData.length; i++) {
                if (csvData[i].data) {
                    parseData.data = _.concat(parseData.data, csvData[i].data);
                }
                if (csvData[i].report) {
                    parseData.report.duplicate += csvData[i].report.duplicate;
                    parseData.report.totalRecords += csvData[i].report.totalRecords;
                    parseData.report.saveReports.forEach(function (saveReport) {
                        csvData[i].report.saveReports.forEach(function (currentSaveReport) {
                            if (currentSaveReport.reportName === saveReport.reportName) {
                                saveReport.data = _.concat(saveReport.data, currentSaveReport.data);
                            }
                        });
                    });
                }
            }
            resolve(parseData);

        }
    });
};

let save = (resultData, filePath, fileName, header) => {
    return new promise(function (resolve, reject) {
        let data = [];
        let temp = [];

        if (_.isObject(header) && header.header === true) {
            data = [];

            for (let key in resultData[0]) {
                temp.push(key);
            }

            data.push(temp);

            resultData.forEach(function (d) {
                temp = [];
                for (let key in d) {
                    temp.push(d[key]);
                }
                data.push(temp);
            });
        }
        else {
            data = resultData;
        }
        let wb = new Workbook();
        let ws = sheet_from_array_of_arrays(data);
        let ws_name = "CleanSheet";

        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;


        XLSX.writeFile(wb, (filePath + '/' + fileName + '.xlsx'));

        resolve();
    });
};

module.exports = {
    readFromFileAndRemoveDupes: readFromFileAndRemoveDupes,
    save: save
};

function datenum(v, date1904) {
    if (date1904) v += 1462;
    let epoch = Date.parse(v);
    return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
}

function sheet_from_array_of_arrays(data, opts) {
    let ws = {};
    let range = {s: {c: 10000000, r: 10000000}, e: {c: 0, r: 0}};
    for (let R = 0; R != data.length; ++R) {
        for (let C = 0; C != data[R].length; ++C) {
            if (range.s.r > R) range.s.r = R;
            if (range.s.c > C) range.s.c = C;
            if (range.e.r < R) range.e.r = R;
            if (range.e.c < C) range.e.c = C;
            let cell = {v: data[R][C]};
            if (cell.v == null) continue;
            let cell_ref = XLSX.utils.encode_cell({c: C, r: R});

            if (typeof cell.v === 'number') cell.t = 'n';
            else if (typeof cell.v === 'boolean') cell.t = 'b';
            else if (cell.v instanceof Date) {
                cell.t = 'n';
                cell.z = XLSX.SSF._table[14];
                cell.v = datenum(cell.v);
            }
            else cell.t = 's';

            ws[cell_ref] = cell;
        }
    }
    if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
    return ws;
}
function Workbook() {
    if (!(this instanceof Workbook)) return new Workbook();
    this.SheetNames = [];
    this.Sheets = {};
}
