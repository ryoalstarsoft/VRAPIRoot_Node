/**
 * Created by titu on 11/14/16.
 */

const _ = require('lodash');
const settings = require('../config/settings');
const commonHelper = require('./common');
const promise = require('bluebird');
const zipHelper = require('./zip');
const pdf = require('html-pdf');
const fileHelper = require('./file');
const moment = require('moment');
const log = require('./log');

let saveReports = (report, directory, header) => {

    let cleanDirectory = directory + '/' + settings.cleanDirectory + '/';

    return promise.map(report.files, function (fileReport) {
        if (!fileReport.reports) {
            return;
        }
        else {
            let fileName = fileReport.fileName;
            let fileExtension = commonHelper.getFileExtension(fileName).toLowerCase();
            let fileNameWithoutExtension = fileName.split('.')[0];
            let handler = commonHelper.geFileHandler(fileExtension);
            let delimiter = null;
            return promise.map(fileReport.reports, function (reportToSave) {

                let data = _.map(reportToSave.data, function (d) {
                    if (reportToSave.intact) {
                        return d;
                    }
                    else {
                        return [d];
                    }
                });
                //write the report files
                return handler.save(data, cleanDirectory, (reportToSave.reportName + '_' + fileNameWithoutExtension), false, delimiter);
            })
                .then(() => {
                    //write the clean file
                    return handler.save(fileReport.data, cleanDirectory, ('CLEANED_' + fileNameWithoutExtension), header, delimiter);
                })
                .catch((e) => {
                    log.error('ERROR CATCHED IN REPORT - SAVE FILE!', e);
                    throw e;
                });
        }
    })
        .then(() => {
            log.info('Creating PDF report');
            return createPDFReport(report, directory);
        })
        .then(() => {
            log.info('Zipping all the files');
            return zipHelper.zip(cleanDirectory, report.cleanId, 'zip');
        })
        .then(() => {
            log.info('Uploading the zip to FTP');
            return fileHelper.saveZipToFTP(report);
        }).catch((e) => {
            log.error('ERROR CATCHED IN REPORT!', e);
            throw e;
        });

};

let createPDFReport = (report, directory) => {

    let cleanDirectory = directory + '/' + settings.cleanDirectory + '/';
    let options = {
        "format": "Letter",
        /*"header": {
         "height": "1.5in",
         "contents": '<div style="text-align: center;">Email Scrubbing Report</div>'
         },*/
        "border": {
            "top": "0in",            // default is 0, units: mm, cm, in, px
            "right": "0.5in",
            "bottom": "0.5in",
            "left": "0.5in"
        },
        "base": "file:///home/www/your-asset-path",
    };
    let tableString = [
        '<table cellpadding="2" style="border: 0px; background-color: #F0F0F0">',
        keyValueRow('Customer:', report.userName, true),
        keyValueRow('Clean Id:', report.cleanId, true),
        keyValueRow('Date:', moment(new Date(report.startTime)).format('MM/DD/YYYY HH:MM'), true),
        keyValueRow('Date:', moment.unix(report.startTime).format('MM/DD/YYYY hh:mm')),

        keyValueRow('Total pre clean emails:', report.totalPreCleanRecords, true),
        keyValueRow('Total cleaned emails:', report.totalRecordsAfterClean, true),
        keyValueRow('Time required to clean:', report.timeRequired, true),
        '</table>'
    ].join('');
    log.info('directory: ', cleanDirectory);

    report.files.forEach(function (file) {
        tableString += [
            '<table cellpadding="5" class="border-table">',
            keyValueRow('File Name', file.fileName),
            keyValueRow('Pre clean emails', file.totalRecords),
            keyValueRow('Validated emails', file.data.length),
        ].join('');
        file.reports.forEach(function (fileReport) {
            tableString += keyValueRow((fileReport.reportName), fileReport.data.length);
            if (fileReport.detailReport) {
                tableString += '<tr> <td colspan="2">';
                tableString += '<table cellpadding="5" class="border-table">';
                _.each(fileReport.detailReport, function (detailReport) {
                    tableString += keyValueRow(detailReport.name, detailReport.value);
                });
                tableString += '</td></tr>';
                tableString += '</table>';
            }
        });

        tableString += '</table>'
    });

    let html =
        '<div><img style="margin-left: -30px;" width="40%" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABRQAAAH0CAYAAABM7aF5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAQaBJREFUeNrs3U1yG0eiLuyUw3PqhAceCj31NxB7AW3CKxA7wneib6DyCkSvQNAKRK9A0OB6chTR1AoE9gZMDo6mDQ49cFzxLsC6lULCpmiKzAKygKrC80RUUD9g/WQlClUv8ufehw8fAgAAAABAji8UAQAAAACQS6AIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEA2gSIAAAAAkE2gCAAAAABkEygCAAAAANkEigAAAABANoEiAAAAAJBNoAgAAAAAZBMoAgAAAADZBIoAAAAAQDaBIgAAAACQTaAIAAAAAGQTKAIAAAAA2QSKAAAAAEC2LxUBAAAAu+D/G/8vhUAT9+tlP/15P/39+r9fdXDLus7rZVIvJ/8z+28lS+8JFAEAAIBdtQwH4zIKfwaHDwtvJ67vX/Xyz3o5Uez0nUARAAAA2AUxKByHRWi4/Lm34X04CgJFBkCgCAAAAAzRMkBcLg8VCZQhUAQAAACGYlQvh2k5UBzQDoEiAAAA0GexJWKVFq0QYQMEigAAAEAfxVaIVb08UhSwWQJFAAAAoC9ia8Q4sUlVLw8UB2yHQBEAAADoulH4M0jcUxywXQJFAAAAoKtG9TKplyeKArpDoAgAAAB0zbJr8zNFAd0jUAQAAAC6JAaJk6BrM3SWQBEAAADognG9HNfLwwEf48xpZggEigAAAMA2xe7NMUg0TiL0hEARAAAA2JbDepkG3ZuhVwSKAAAAwKbFVonTenm0Y8f93qlnCASKAAAAwCaN6+Uk7GarxDOnnyH4QhEAAAAAGzKpl7dBF2foNS0UAQAAgLbFLs6zMOwZnHPMVQWGQAtFAAAAoE3jsAjSHioKgSLDIFAEAAAA2nIUdHFeulQEDIUuzwAAAEAbpvXyRDH8wYQsDIZAEQAAACipi+Mlnqd9en/l38b1crDBfZirGgyFQBEAAAAoZb9eTurlQUf2501YzCz9udaBo7Dolv10A/syVz0YCmMoAgAAACXEMHEWuhEmxvEKf6iXw3B7V+N5WASKfw/tj3GoyzODIVAEAAAA1lXVyy+hO5OvjMNiDMdcZ+l32gwV56oJQyFQBAAAANZR1cvLDu3Pj2G11oDxdw5b3C8tFBkMgSIAAACwqknoVph4US/Ha/z+rF5etbBf56oKQyJQBAAAAFYxrZdnHdunSUfWcZ3WiQyKQBEAAABoalovTzq4XycF1jEPi5aOJQkUGRSBIgAAANDENHQzTIzdit8XWtes8L4JFBkUgSIAAACQaxq6GSZG7wuua15432aqDkMiUAQAAAByTEN3w8QuO1UEDI1AEQAAALjLNHQ/TNwvuK5xwXXNVB+GRqAIAAAA3GYa+tEycS+UCxVLhpMzVYihESgCAAAAnzMN/ermXBVax17BfZqpRgyNQBEAAAC4yTT0b8zEql5Ga65jUnB/3qhGDJFAEQAAALjuKPRzApbYsnC6xu8f18uDgvszU5UYIoEiAAAAcFVVLy96vP8HYbVQMR7308L7cqI6MUQCRQAAAGCpqpeXAziO2LryLOR1f74fFsFf6eM+r5e5KsUQCRQBAACAaByGESYuPayX/4RFa8XDG/4/zuQcuzjP6+VRC9ufqlIM1ZeKAAAAAHZeDNeG2j33SfhzPMjLenkfyo6T+Dm6OzNYAkUAAADYbTFMnIXFhCZDt7eh4zwNujszYLo8AwAAwO6K4wdOw26EiZs0VQQMmUARAAAAdlMME2dhMdYg5cRu1bo7M2gCRQAAANhNcUISYWJ5MUx8rxgYMoEiAAAA7J5p+HOiEsqaKAKGTqAIAAAAu6UKwsS2mIyFnSBQBAAAgN1R1ctLxdCaY0XALhAoAgAAwG7YDwKvNl0Ek7GwIwSKAAAAMHzLGZ33FEVrJoqAXSFQBAAAgOGKQeI4CBPbFlsnThUDu+JLRQAAAACdEkPA/Wv/NkrLVfvptVcdKL6tmCgCdolAEQAAAMq5GvLdFAwKAYdH60R2jkARAAAA1hdDwmm9PFIUO6dSBOwagSIAAACsZxwWs/sao3D3nIbF+JSwU0zKAgAAAOs5DsLEXXWkCNhFWigC9NS9e/cUwhZcVo9vGgsper83/flMCQF3+fDhg0KAYanq5aFi2Ek/1Yv7P3aSQBEAPiOFh4dhESDG5eCO1y//eJpuLuMy25v+PFeaADBI8V7hWDHs5q1iMLMzO0ygCEA7d1jV43H9Y5SW9yEFbHvTn9/3YN+rsAgSVx1U/SBcCR/r9Z2HxSDt0z4cP9CuTbUw/+bg+3gdfrvBQ3v+7vS1h2ta17FWvrHO6+q8m47SPS7sJIEiAMVcVo9H6cb68HM31/Vr3tQ/jvemP886uP9V2v8HhVcdu0G9iOuut3Gcjt8NKAD0W7zveaoYdlLsjTJVDOwygSI74f/+8P+Pw2LmtS6a5naHvKweTzp6DPP6GHyg7rgUlOXcVMdWf49SsFh1IVir92U/3RS2Pf5RDFmf1ctRDC/rYz9Rcz62opoM6HBiS9xYp+fvTl/PnV2AQXP/u6O3vWExbibsNIEiu2KcHuK7aBYfPDNf29Vj8A3dLt9RLcYZjMHYQcNfjcHiLHaN3maoWG8/dld5seHNxmDxX/W2f6qP3cyA3b22reWbg++X18d4nT97d/pagAwwHIcr3PswDJMGz28wWAJFANZ1vMYNdWwRuLVQsd7utP7xZItlt6/6DN4f42l+c/B9bNEQQ8Xpu9PXM0UD0Pv7H3bPqXMPC18oAgBWlcYcXDeQi6HiZAv7Pg3bDRNDMDPgrtlLde7tNwffz+ulUiQAvRQ/vx8oht279Q2LlqlA0EIRgPVvqEt4GsdgzB1PdO27wW6EiW+6ODENGxMfRF+m8SOPdIcG6I1RWMzuy+6p/mf23ybVg0QLRQBWklonlvx2/miD+/2kA0XoYYSQ3kP/+ubg+1m9jBQHsAtiC+0eX/MmYdHinN3yU1gMWwIkWigCsKpx4fXFLiSthmyX1eP48NKFcW9ebao1Jr0Rx1k8iw/ZWisCQ1Rf3+IkblX6rH9QX+vu9fTe54mzuXPOgy+C4S+0UARgVaPC69vEWESTsP1WBZduSvmMj7N/p27QAIMQg8R0XZvXy4vQ77EHTcaxe+J921gxwF8JFAFY1UHpFcbZnlu7G6wexxmVu9Cq4HgbM1rTK8/qh++pYgD6LHZpvhIkPgv97yZchcVEcuyW2IPGfRvcQJdnAHZFF1oFxm+5tW4gx5P6Qfz9u9PXWrMCvZLGRpyEYXUNvu/zeyf9UC8zxQA300IRgFVdtLDOeRs7elk9vt+RB5sjrRNp4GkcU1ExAH2QWiRO6z/+JwxvnMFJMBHLrnlVL1PFAJ8nUARgVfPSK2xxopLDDpTXRX18bkxp6mX9gL6vGICuqq9R43qJk0kNMUiMRvXy1JneKadh0cUduIUuzwCsKj48lBxH8U2L+9pWoBj3+Sz82R1mHBbdouLP6+Ms6brKqqb1IlQEOiUGiWHRcu9g4Ic6dbZ3ynnoxhfR0HkCRQBWFQPFF4XX15ZxCzeb1d7057Nr/z5b/uGyejwKf44hdVq/9kSVYUUP48QG705fTxQFsG319SiGLfFLsoMdONzDHTlO0u1bMAkLZBMoArCS2D35snocx5cp0b3pvK3uwGn8xJLjHv1Y7+txTvnUP6p6+wZxp4Sj+iH++N3paw85NBGvQ88zXvdMUZEjzdq8S/XFZ/juiGHiOLQ0njcMkUARgHXEFgrxm9x1A7uqxX0s2VX0TU6YeNUNrRhhFXvp/TZRFOR6d/p6nlNnvjn4XqAIfxXfOw8Uw84Yh8UwNkAmk7IAsLI0Y3G8AbtcYzU/9Ch0Mw4i6h/A8I1cc3fKD0GYCI1pochO2Jv+PAl3fEN/WT2ehrIz08UZXUeFj+NezuvqY4kfiA8LbvrHpq2y2Kn311ld58ZhMQZik2/yYwh5tIGZj8eF1nPa4izUO+3d6es7r23fHHw/C2XHsfqu3u5slV9MExEsJ98ZF77e3vp2q7dd1fs9VWsAWhWfG/YUw06IYaLPVViBForwp9ITJjy4rB5vfFbONBFE6YfbmerBbVILw1jffwp5rRXj2Iv7GwgTvQ8oLgaR9XJSL0f1Euv931Ld3wQzTwK0axzKNjKgu4SJsAYtFCGJM7BeVo9jEFLy28h4Q7Lp5vOlHzYvjAFH5nsodn8+qt9Hk1QPY/0fXXlJ/P9ZvZz0tKXf3FnmJmmcuo+TpqQHkzZnBB0rcYBW6ZWzG4SJsCaBInxqVi+PCq6v2sJNSemHzRPVgiZSsDgd4E3a3NnlNilYHH9z8H2s+221bondnserdtcG4M5794eKYfCEiVCALs/wqdLh2cPUBXkj6m3FMb0eFV6tD1uABt6dvo4PpKctbmJfKQMUF++jtU4cPmEiFCJQhE+10RpvvMH9190ZoBuqsN7s53c99AJQ1iSYiGXohIlQkEARrkhdNd8UXu0mB9AfF16f7s4AK0jdn9t6aBkrYYCiRvXyVDEMmjARChMowl+VDtEepa7Im1A6vPShC+AaCuB6TZ8JE6EFAkX4q1kL6xy3vdOX1eO4jZLdNHR3BljDu9PX8Rp6qSQAOi1+IX+gGAYpfgZ/F4SJ0AqzPMM1e9Of55fV4/NQdoa3eKPSdvfh0q0TN9LdOQWhcYKB2IpzfO2/483dRfh0dt34gB67ps/in1M3dYCuOvOgClz1zcH3o3TvE5dRWpbinx+ETyd2ep+uJfF+6Cx9WUE5JmIZpsv0bOH9Ai0RKMLNpvXyouD6NjGOYi+6O6dZrw9D/rfBD9KytPydZ2l9MXCM4edsb/qzMR8BWvTNwfdXQ5D4oBa/DLrtC7jll0LLZfbu9PVsQOUxTuWw/GIsNzyOX1wuvxyLSwyJfEE27PfO8t5nfO2+5nOu16VHV9YVf7xJdeckjdnKaiaZ54N+ESbCBggU4WYxmCoZKO5dVo/32+pCHNdd+GaoeHfneh+r+sdRKNvyM6TjjoNoP03h4rRejku2XExjYO5vsP5ltbxcY7/e33V+t3DM89g6eMW6f9cYpaNC+7hfb2+l40ktcbfh1rq0rf2q92nmY6Y/rgQhcWk6tMbyS6E/vgy6FoZM+xSk1ft+/0pZPFpjVcvPwlguz9K636T7j5NdCxdTue5vcRfmbYRyqSXiZMX3zl0epeVFqjvH64b1aX/v+swcFSyfpp9BpYP3Ubo3ZVjO03turiigXQJFuPlht41uz1WLNy2lQ4FiLf3qcpykY9/Et78P0oPZUb3d2H2lVLAYH3LebrAKfhduGMuzPqZly4bxunXzWjB2WpfTeMvH/Dw9dDV1HDbXnfTFGsezybK8sy51YL/u7dBHShuTcs3a3ukULCw/t/Za2ETxMGQD5RHf009a3MyyTF7W23sVt7dDLc82/ZlT6jPoc/VlP63v0Yb2/2Pdqbcbv1it1ngvVek+alOanvO7PtOamrR0fWN7ztN9shbfsAECRbj9ga30OIptBYpV1x5WU/gVw55tdCPZC38Gi5O96c+9HRsndRGfhHZaNwAtSq2uHvZsn5fXnCcb3OwyDIljxk26FCym8piGzY+DGcv/yQ4Gi0N4zx9v+P1zVbznepveS5V6c6vxFs8T7XiVnrWEibAhZnmGz5uWvslL4VBRaZ0lH1gv1xmLMO5PvcSHwX+F7Y9JEwO4F3F/2ij7NsUux/US6+B/0g2vMBH6p63xc2elVxiDkHqZXLnmbEMM7WIYMkstvLYmlcdxKo9tTqoTz8V/4r6ksIqOqs9PFRZdLLsQUsU6e1bvk+68n2cilmGJYWJ8DwoTYYO0UITPiGPMpTH5SoZihy3cwIwLr2+dMDEe3zR0L/z6eGMdx4traxzLFkKIkyBEhL6rWlrvvOTK0jhm09CdiQniNfuXer+evzt9Pdn0xjtYHlEcK7iq963JZ1gcn3Lqbdh6fbmf6sujju3axy9VUzh/ZNKfv1ybHyqGwfgxCIhhK7RQhNuVnjW4jYfLwy4ccxor8V+huyFY3K9f0uQwXfc0CBOh11LLoDZatl2U7MaYWiXGccy6OMtpnMDlLHU73tR563J57KU6lbuMvBNbry8xrJuF7oWJV8UWkzMtXFu9d2Z7fgjCRNgagSLcblp4fQ/T7LkllbyJXam7c+qa+6wn5/RlT0JFoKdSyPCipdWfFNrH2KX3pAfX7tiK6GwTXaDrbfTps4xuvM9noR8t3eI+ChUZkst6+XsLz2pAAwJFuEXqHntZeLXFvhVNXYy3+qCawsS+DWr9soWyA1iOo/ZLi5uYFtjHGCrMQrdbVX3ycRwWXaCrls7Z/dSV2AQN5NaZZZjYp94ED8MGZojviZMO7Ut8zogz3ceWdq+cmizLmZzPFAVsl0ARNn/TcdjRdTU+1p6GiX88lNf7v696AyXEcffiZCL1H1+2uJnY3flszf1chol9HD/sZUuh4kkwnhr576E+holLD1NL3F0Xy2Cb4d1F2v4/6+V+up+P+1QFoeJdhInQIQJFyHvQKKlki5CSgWKj7s6p23CfW3PEB4FpC13Qgd0JFmKIOEmt2+K4e23PBjxZc3/7HCYuxVDxsOA5nIbtzuJMv97zywlY+jzO8ZO2Wvv2TCyDTYZ3MQj7KSy66Y7S9k86sF99EsslBvomGIKOMMsz3CGGbJfV48uSN4+xu+0qYxVeW8d+4Rvak4bbfjmA0/swPaAfqemwc47rh+pVH0pKX3+zHkYLzNg7DcNoiTeNYW6B1prx+q+bM7v4HorXv1nJCZ56qko/27oOnKb767jMO7RffT9fQEcIFCHPSeEP9cOwfsvHqoVjvFNq0XcyoHP7NHbdTuNlArujb6HAWl98pPDs0UDO3ccW5ilUfL9ieYyDCVhoVmeOhvYeCouuo7tueT9d4j4/NkCYhT9DxPcd2S+AVujyDHlmhdd32JF1/HED1KDFZHwofTCw83usigMd9vzd6euVP4cGGp49XPXafaXbKuTWmVFYc8iBDjpI1wbW62b8ufEQ3295vwBaJ1CEPKVb5O2tMyFI/bvxxvbBpo8v7fPTFsr3Mt0w/Vgv36Xlb/XyX1f+/mN6zWUL2z+oj81NNdBFr96dvp6suY7pQMvmyYqByCQM74sx2hXD6zaGOViOq/fP5f1O/X6/Fxbj7H2X/v15el0bpk7tH6qQH97ljoe46f0asgtFAN2jyzNk2Jv+/P6yevwmlO3qEm8QVu3CVnp251mDG+rSNweTunynGfv28Wfqcn2UlpI39/EBc6y2Ax0Sx02s1llB6uo85PBsmh7oc8ujrS/GGKgUWpfu6hwDosnnxjC8Nj5oDKomaT/i+7nkJEIP4iRH9fZOnOk/7s2jm7oZrzoeYtv7tSvmqid0jxaKkK/0zdY6oWC16WNLLfhK3sQ+35v+PLojTPyLGO7WS7yhjg+FJb+x10oR6JLYMnF/nRWkbpqbmHQqXovjl27Pryw/pQfwy5a3/SCFprkMcUFTk8Lvlb/HLwqaTogShz2ol3if8mPh4zMx3V/vsf+WrmFx+SEsesyM0/VjvsX90lIR6BQtFCFfDN1Kzmz8IHZd3pv+3OjGJLXQKzmZwJsY0m34hvqHpkHidbHcUgA4K1geVSg/Xibtmmacs1hPSoThrxo8SKhHrON5gW7Oy+t2W7NRn6eH65O7JkaJLaDC4ku0tlrXHNXbOM7Yj1LXgruuE/F+4exzgVEKevdTmRyGzc8YTqbCdSa+Z1aeSGip/v3lDPWl7knjWIqjVF9zPrvivVKpVs/PG75+vqFTH7fTxaC1Sj9N1AJ0gkARMqVuz/FmsGSYdxiat5Yo3d05p3XiqOAN9dph4rVzEsvjrNAD2efKNq7/uzt+Nz4cvmixCl6kcxVv9mMrzdmV8/Ohhe3lHHP0dsvvy2lG/Z0Uqr/Tq+Xe0OfKsuSsoRfhr62Xzxru16jgQ+qPGdvnr+fw8Fp3x5WkiUeetLSPVZNJYlJ3ypPUkvA4lO8+upfq/l2fp20GBDEYOc4Ji1JwM09l0tYwHn3Txrlpcg2af+bfq0L7UiRMvFKHpoW773+sg+l9Pbvj2jIOhQLFQl+c7JplnRQqAlsnUISGgUIoGxrlPABdt/FAseCN/ptSYeIfT5GLloqxDEvMYBonyzm8PuN1asF56w12/XttBgzVGkHWquV65zG3fNyD8rnzV5dffIgtFa7EB7wYNp+tul8pfC1Sb+t161qaL3YLPi78cN1GQPMqhQ4rhSIpSDv85uD75WffXuHj/WydS60CH7VQJjEoqlYNgVNZxvHxpunz+OGuVf7UgrX0uYmtfI/X3K+SoXxVKky8YpLuI0t9oarrc39U6ecuhYq+oIQOMoYiNFN6HMWHqQtzE+OC28/t7lwqxGzrZrVkcHHYofoWH973Nx0msjlpyIPTFh4ytvX7bbwnh+7j+7yFljpV6f1M476tHYrE1lXps6zk+IoP7pjxuY1rexw3clyiRWkMW9OYmTs1RloKeqct1NUS76fDgvtTPAxJ78VpwffPyOW4V6odu168d8qhewSK0Pzh/7zwarNvWFP33pItOnK6O8cHnBJdW141HS+ywXl5X/CmatyR6nZeH1eVGfjSbyXDt2rVX0zXl1LjYk2d1iyxBfK06eQMd0ldIUvO7Pxq3dmmr0sBS1W4PKs23hufcVofw2HpVmepnHcpJJgWvq85LVhXSwWKk558fmz6C9XTQIlrnolagK0RKML2H5QPW3ptjpMNbrPtFkuzQut5kMaM3DZdj3ZE6mJ/UWp1KRjc5sPkK0F4/vWmXt42nKU49yGzlPPSYeJSGlvxp7Y/T1PLq5JdiS9Ci+HLroSK9XmJn3MlJ8k5L3xexgXW8ab0FwbX6so8lPuiez/QRztxvQC6yRiK0Nys8PqajBs0Lrjd3O7OJbYZu7XdT7Myt6VkgBFvqudbrGPnujnvnBi4lxqfNT5cNBqeIQ298KTgsdDMszTLalVofSVDlba/3Jik/S3RonIvts68oXtp6c+eNsbDu6ncp2uuY97VCp9a0ZYckzreZxRrMZq6z5doOTm/oyt+CfE8lwjMx4G+Wn52mKgF2CiBIjR9Wpn+fFY/fF+Egt3JbpoI5IbXlO7Clhs4lGg9EG/K3/boNO+H8uNltnFulr5bc3tak23ftODD9aPYyrbhEANVoW2fN5kUhk88+ebg+7BuqJgmkij1WfGqyWzOq4gBUGqhWWp28XH46+D944K73HqZLMsllP8CcxNiOP5sw9uMYeK4cEvAUq31noZyMzG37UGgz5afHUMNFWdOMXSPQBFWc1L4BvEw3B0iVS0cw+136N3o+rsNver2ozVj/8XWwvX77VXBB4F4TWnSUrBUKzStE9cTQ8VZmrRkVeOC+zPdxEHH462Pu9Ssz+Mb6mHJa7o63j1VC5Oe7GT339iachOBOe29F5afJYoC2ARjKEI3HrJyuqeVfEjM7e482tHze18VZwtKBhXZAWEaiqBEy5TL+roydRrXrwdrzrZaKgi52HCwUKpV+E1lV2r8xPM2ZutlLT+ksThLGylaeqoKxlQENkSgCCtIXfouSq4ydWn+3AP/KJQdUD73IXFXB+g2MDnbuq6UmvXyQYMxS6tC2+xby634wPU8Y3kTNjsbaWylN1nj90eF9mPTwz6U2t4nn5VrhrPXTV2puvUeXrM1r/uAvxqrVoNQBaEisAG6PMPqZqFsl4L44f+5VkXbmN052tWWenuqN1sSH45LzXpahTu+PCg8Gcu0b2XdtAVemlyhStfkNq8TsevzZMUx4UYFP+M2qVjLvzTBzbxweRTdR9b2qq3Zx90HMBDL98dQuj8b7xs6SAtFWF3p1hvjFf+vqfOGkzUAG5K6DJdq/XyYAsOcB451vdmF60oMIFOIMaqXn1re3GTLh3u24bItWX9GbZ1/V6lOOA/tzz4OQxA/r4bSUtEXOtBBAkVY/cE/BoqXBVf58KZJUFIg8KjgdqYNXmssQdi8aaH1xBY2d7Vurgpta6cmqogz8NZLDDT+Wfhz4KrDNGNzUweFjnG+haI97fBpvwh05TyM0yzYlOe+b3ji57zuz0ArBIqwntKtFA8z/21T+7yzYwk2GH8OStvI5Cxp3NYSY7Ne7OpM42kyiLauFXvBeGZdMlcEnXAmTGyVMaSHqQpCRaAFAkVYzyYCxZIPlE27O+teABuWZmAvdeN/Y8vnpFSXweNdPl9p1t8fW1r9oXcEfOLRNwffV4oBGquCUBEoTKAI65kVXt/BDWOelXygnDZ8vVYAsB2ttlJM15kS15bLYObbGCrG89VGd92xtwL8xcs0QRLQTBX6GSoacgI6SqAIa0gtid4UXu3hlYf+0jOJnjhr0ItrS2z1dl7wAeKm60yJa8tJug7SziQqD+KMxdt48Fpx/MZ1dbm75UgV75STuo7qngur3RP0LVScO23QTQJFKHBTW3h9V1sNjQuu1+zO0C+lWinupS8nrtLdubA0A/B5C6tu2pK01HV+G2FNqS/Q2gi5H6jlnRLrynRLwTf0XRV0fwYK+FIRwNpioPiy4PrGazxI3ma6wu+UGkPxVejft4tzVZutPi1Pf55eVo+PQ5mQpUrXqpKTsZymlpR8ep19UXid8TNhG8Ft3O5sUxsr2YU1jWu5/POsXnexfUzBMd3wMF3Xxi2sOw5hsO6M6Rehf0NCuPfZHXoXAGsTKML6D/3v6wf02O35UalVptZE8aauZIuIVVpSlrrZmO7qLLCwphgkPSuwnkdxcpbUSrlU68Sp03PjdbaNQLGJGKYdFNhu/ByabLDsSn2BdvmZf9srtI8+y273/N3p61vrTeqq/Euh7R3U6zuut3nUwbJ4f1dZwBaNFQGwLl2eoYzSDxiHoQPdnQuGgG5aYDXTkteVkpOxxBaUTs+n3p2+jtfZ0oPH7zUcK25eaLsPVxi/cd3PvRLOMv9tm/uYJZ73eoljBR5t+Fy0/T4pPTP60xZmfp4Veg/pkk0XxevJwx7tr94Q0FFaKEIZpVuljEPZ8avWuTE+L3DTEW/0J6oJNBO/CLisHschA54UWF1swRNbHZdoqWXsxNsffEqPtzdu8EBV8sFrEm6e1Keo1N35QcHyv+nfSrTafLDhbs/Hab9jD4gX9bYv0ud5vOeY1fvR2y6LcWb0dN5L9e6IMz+fXe3u3kI9WkUMoadtluU//vGPjZ673zqy799+++3qG/7i6868F776/ddx+ny+f6XuHf/2xdfzFjd72LNLhu7Z0FFaKEKhh/5QdjD++GBV8pvDdW5mS9xUP7isHo/VFNj4+/f6dWXSsX0aojZaUmRfPwuHXU821DJu0nL5lyyTjYTpdbnHB/6DG97D8cuFf9XL/6lfE8eHnPR4tuMqlG3ROytYX88KHiPc6Kvff42fpW/DIlg/SMvTWP/q/2uz7hwqfaAEgSJ076G/tIs1J04o9SA2UUWguTT0QKkvLEq0AntlxviNXDOvGjd8/WlfPttSV9WDlsu/5DmJ3ViPWi6T2FIpJ7iM5RbHWP2l/p339RJnPa760j06tbAsGWzE1tcnJboZFxy+4CCFw/CJr37/Nd4XP7mlLr+sX9NG3blf+JoL7DCBIpRzMtD9KnVcB5fV44lqAivpUhfjqdNxqza6ZjUdR7Hk59FBWwFaCr5K1u3zFAR9IgVXbwpup+1WgfE91jT8jwFEDCde1st/YvffOFlJ11svtjCe4sOC16hS76OpsRS5KnVzzplwrY3PfgE3UIxAEUo97S1a7Fx0cNemax5XfBAr1Trq2WX1uFJboPH7ML6PLzuwKxdmbL9dwTHc1nkILP0F14vSk16kgCXu517B1U43VCZxn2dthESxlWEoM65gDNae9uQ9E0OTkoHvoximbvv+aRP1hf756vdf7ze4Hj1I4eO2Pku6wn0HdJRAEcrqWivFdbs7L5X8hvTlNkLFOLttveyrovTYtAP7MHEaspy3sM7sh8rUSq/0PrwsFSqmYCU+IJaeZfRkg5/PMSQ6K9kCMIWJTwru40WLAXdpVeE6u/bMz6nsSn1RHOv6VkLF3774er9ehJndelbY2+L2x04BUIpZnqH8A3+XWgScFFzPccEboBgqjvamP0/aLoB6O4fpQSW2+LhM2zVbHH10vOXry2Xo7tAOXTMP5cOy2PX4tmvm9Fp331hfXhbeh5dpZt6jVWcYTr/fxgP1m5u6Oy/F/a23XWrG9KXYLfnjxCiplV1YsUxGqUxK15lpX94w6fzEz+pZyXuNep0vM7d/75YyfFZof+L5jSH0YdtB729ffD1K9z5VqqfPQ/e+ENq5L3m/+v3X5czt23IYthtmAgNz78OHD0qB4Vf0e/c298RdPZ6HMhMflPD3Qi0U43FNCz+IRfGb/6p0F8oUIh5+5sbpp3p7Rw3Xdz/jxjf+/4tCh/Cq4YPg+1LnueExR283dcw31ZMYENc/RnesuypUd+M4X7nlPG9j4pL6eGPo8GhL15M4GUvVxopTyHSX41A2cLnrfJ6tEZpNCoYQub67PsNznKijpYfHGC7H6+hJbhmlczxp8WH6u7tmuE7B3X9a2n6cCGfSZJbt1FrtqMW68rewGNOzC9fy9zkhWgoVX274vfPZQLHFOvNTqi9rf8H5j3/84+PPFCIuv0S96Vr5t69+/3Xtz6V6O7OC7+P/qvdp41/y1sew8Q/QNMHKv1a41o7q/S1VRm3cy2/k8y10qNvz/8z+28M1JFooQnnxgb8LrRQvCodMkxZuQmLw+vayenyebnJOVglh6t8fpwem+POusOVp/frjhtvZL/iwleNJw7I+DeW7sHTxmG964KvC5oKbJoFxW61BjsP2AsVJi+t+u4Xjuet8rvMAs41upqPP1Jc23h8fZyCN6//m4PuTVE5nVwOjFMSM0rXpMJRvfffJNTAnyIstGFtopbgUA5a39fovlp9nNwVoKURclkmbD/av0vGOO3Itz/qcqvd5mva5E6FHi3Um3ic+TeuOdaVx6+/0Htv/7c/6dNeX2ZP0mdklR2F3htJYpRXzccEwMYT+dnfWswg6SqAI5c1CNwLFol0TYwB3WT1u60HsYXq4f5HCxfgQNk8/r95EXG01N05/X+UhtYs31ZDzPpzV75GLsPlW0KdttLgcsG2U1egzD7BVi/VlObPwx8+Fbw6+31Z5Txq+ts2wKpZ1DHGfpfI4vfYZ9nAD5bFsQdpXR+mz/mFH9qfNOvPx/VPXlct0zzNL9z3Xw+j9VH+W90H7oXnr4ye/ffH1pEArxbhvpVooHtX7dJzbSjGOBbmNFo3rqvd5tMJ1+Dyer4K7sR+604Oq6fXsLACdZFIWKP/AfxK6MRvrtKWb6raP7WG6wY4PZLFryNsry7+WD2rpZnbVh40nJmihxyZb2OZUsefrykQYqTvlZODF/aZJN+M0zuJPG9y/gyvLpgKy4xJdabdcb6uO3Ettqs7spToS729eXLv3eZv+Lf7f0/S6VYcyKHEtf1/4uGdx4pib/jN2466Xql6mqaVeX4PyUcPXx7pfejbmqqdldxyAzhIoQju2PXFB6e7Oi7u+RQuloXywu0Ghz9eXTT5ox+vJVLE3dt6FnYhdSMOnreSGZNWWeJNQbvbeztW7+pxP+n4QKZTvUng0lDpz8NsXX4/XXMes8D7FoP2XGBjG8RmvLDFAjONXxuEV4hfNMXzs5ZfBadzJJmKIOi+8G+MeFt152J0u8dBLAkVo74F/m2ZtrTjNzHw+gHN0kMZehF5Js5RPN7jJqVJfybxD+1KFjrT2KuzotpmdP+dKC7ghGsxxpTD8VUf2ZUh1ZrLOL3/1+69t3WMuW2kul5taYfb5vu1N5ute/fbF16WfI0ahO0MI5HrV8/MNO0GgCO088G+723PbgebhQB5OJ2orPbXJFrZTxb2Szoz5lEK3amDl+yoFTquWySwsJk8akh+60t2+oNhKsSutfWOd+WkAZVqileKbLe37XprNuq91+a575/PQTsvcwx6VU2xR/136zDIZC3ScQBHaM9vSdi9ToNne3dyi6/MQHk5jK8VDVZW+Se/BTTzQvTIZy8o6FeykWWR/GkjZFnnoTl2D3wykTNYKWLuqg+MpdibgXNO6dWWbPXHGfSzw1IV5fEtdjv9eFZ7VeakP97rx+H9IZTQLQC8IFKE9J0PebgotfxjAeTKWIupuew+du2zetR1KYcirnpdrDHPGBScdqUL/A6IYJlZDfSOlVpddOr7xAOrMgzjZyaq//NXvv8bPhm2NKdnbSfXqMo91eRQWX+4s69BF+vso/X9pcWbwg44XzfNULu45oGcEitCek6FvN03U0PdQ8cFl9bhSXemb+v03a/mB7jxtgxV0tetpCp76GiqWDhOXLeDGob8B0aDDxCvnqTMtbAdQZ5YmW/79VY37XOhp8pmjOLN1vdxLM1kftdQyMepy68TYvflvqS7p3gw9JFCE9h724wfjprtStd7d+YbjnIb+h4oTNZaeOu7pundFJwOHnoaKxcPEK+XR14Dop10IE6+cpy6NpziEUDG2Ulx56IDUSnEbx/+w3u/7Pl6ydTFQjF+GfpfeQ3OnCPpLoAjtOhn49j66Eir2caKWeFNzpKrSU9OW3neXYfuz1Q9BZx+UUhD1Y0/KMX4510qYeKU83tdL7ErZh6D141hjKWDbNZ2ZFO5KqNjXcThfhfW7mFZb2vf9QK5xx65dy+7NM6cG+k+gCO3a9Ifl1gKAFCrGm5a+fFu/vKnZ33SrTij4vnvf0vt+mtbNejo94+6709exFep3odtfBv1Y7+dhm2HitTKpQre/IFu21Jzu4huqazOWpyD6MPRrxvBYh7776vdfq3pZ631V/368xm3ji4nxNgquPt79ejmKrTPrZRbLr14+1Ms8/X1SL6MOnetYN/c6si8xwI5lM3FrAMMhUIR2H/bnYXMB2+W2g7F6+2f1st+DG+t4UxODxInQhAFo4+Zcd+cyzrq+g+9OX8/SQ17XWubFsbX+nkLPTZfJNCxaQJ12qDw+fgkWW1F2dXzODZ6fzs1YnmYM/3vo9peqsUfGDykUm5Vaab2u4y1cP8ab2lAMCOMxxtCw/usv9fKiXp6ExUQny7DuQfr7s3jdr1/blW7GXdiPeB2NX1xVwTiJMDgCRWjfdEPb6UwruxjUhcUgy13rBvRx8Od6/6oU9kLvpbpcMvg49f4ophflmFpZVemhb9sh2sfQo96f8TaDs9gSLu5DWLRWvNhymXz8EiyFVoRujad4ZZ/OUrf5rrVw/RhGp2CslXvS2NoxbPbL5NavDfUxjVPw+p96eRoWoWHWx3K8969/twvjPI63XO9+SPswc9WCYRIoQvtOBradvLup6c/zejlMD6jbbvkStx+DxLGghIE67ui6dlrfWpLF1oopRNtGsLgMEkdd6s4b9yXuU9h8sHi5/OyKYW/q6sunOjOe4vU6Exatfn8M2w2jL1K9jUHipO2NpW38s+Vz8rG1W+x23OJxjFKQ+DYsWh2udBsctt81P4bbD7a07eU4idMADJpAEVq2qW7PXR0HsN6vWWwRGBYtFp9v8Ob6PN3M/5cWiezAdeak0HvrwpiirVyLeuVKsBi7cP7UckAQW7L/s2tB4g1lsgwW/xnabX2//OwaCRLvPCexbKqO7lts9Xu8oTpz1TKI/m7ZInHdcRKbqLcVPz9G6X6v5HVjeUzjkt21b9j/GFTGL4IOCqxu2xPHbOO9cZru9ydB92bYCfc+fPigFBh+Rb93TyF0yGX1ON5kxZYF43TDVWLA6It0ExhvNE8EiOzg+yrW+XVbIzxPQxbAJ745+P7qdXudh+3zdJ3+uGxqspUWyuP+tc+xhyU+uwSIg34P3U/15XDNOnPd6bIOpUCvE3774ut4vFU63qbXjMvleyIupUPRet8++XvqnnwSygSJS6/q7VRbPAWzwsdz13WsCjvStfl/Zv/tggaJQJHdqOgCxU67rB6PwuIb7XiDfT8tn/tmN940L28s52k5M7kKO/4eig+pbwus6r+8l8jxzcH3y+v2crnrwfb90CcTqctkfMfn1/XPsbO+Bqq0VmeW90HXvQ+fjhv4x3vqH//4Ry+O9bcvvh7fcnyf3NO13aryaqCYZmWOYeLDwpv5od7OdItFHutI24FiDH7jMCmTXXrfChThTwJFgL5ewAXlLO/oq8fxoeXJmqt5lYYnAFrm/ptSvv32W4XQ0DJQjDNeh0Xwtld4E7HF3n69nW1+YRC7b79ocf2v0jZ27ksRgSL8yRiKANBjl9Xj2NrjSYFVTZUmALsgdXOOn3tthImHWw4To9hysI1JET9OjBMWXZy1sIYd96UiAIBeqwqs4zxOoKQoAdgR8TNv3W7Oscvvsit6DNc+jvnYgTDx+v1BiS8d47HGFolTVQdYEigCQL8dFVjHsWIEYBd89fuv8TNv1TAxtvqLweGsQ8Hhbar0c51Q8Xm6T9AiEfiEQBEAeipNxrLuzM6Xe9Ofp0oTgB0QPzefrvB7H0O1noSI11XpZ9NQ8TT97ly1AW4iUASA/qoKrGOqGAHYEU0/887DYkzE+UDuF3JCxYv0+pnqAtxGoAgAPVRwMhbdnQHYBVVo1qr/1W9ffF0N7PjDLfcOl+meYKKqADkEigDQ7weDdbzZm/48V5QA7IBJg9cOLUy8eu8Qu21f7/Ydx4Y8CsZJBBoQKAJAP5WYjGWqGAHYAYchv3Xim4GGiVfvH45TmUSz8Ods1QDZ7n348EEpAPTxAn7vnkIYmMvq8STzpbG789MCm3ye+bqploxQjvtvSvn2228VQp44M/OjnI/iehmFDrXU+/e//+3sAZ2khSIAdMezjm5vFszyCEA/xS/hHmW+tgq6/QJk+UIRAAAAMFDjzNedhkVLRgAyCBQBAAAYqnHm644VFUA+gSIAAABDNc54TRw7UetEgAYEigAAAAzVw4zXCBMBGhIoAgAAMET7ma8TKAI0JFAEAABgiO5nvm6mqACaESgCAAAwRKOM18TxE98rKoBmBIoAAAAM0SjjNWeKCaA5gSIAAAAAkE2gCAAAwK7SQhFgBQJFAAAAdpXxEwFWIFAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAIBdNVYEAM19qQgA+unDhw8KYXjudba+vfzfzg4AAPCRFooAAAAM0VwRALRDoAgAANB/+/Uyq5cPaXlfL5OWtjWql6N6maZtvr+y3bP0b3Hb4y2XyTyz3ABoSJdnAACAfhvXy9tr/7ZXL8/q5TD9//sC26nCIkh8eMtrlv93kLZ/WS/HYRE+zjtYdnuqD0BzWigCAAD01/2wCOs+JwZ8R2tuI4aS83p5GW4PE2+yDDZjy8XJhsvmLPN1I9UIoBmBIgAAQH/FsO/BHa8Zr7juGFbO6uVfGdu4y9VgcVPdjHNbZY5UI4BmBIoAAAD9ddjSemPoNw+LrsslxRaOs7C5UPEy4zUj1QigGYEiAABAf41bWGdVL7+E9sYXjOudhc2EijndnkeqEUAzAkUAAID+ygn9zhqsrwqLsRI3sd+z0H6Yl9PteaQaATQjUAQAAOin3BZ+s8zXxe7TLze4/zFUnLa8DS0UAVogUAQAAOin+5mvywnVYjg53cIxxDEaqxbXP894zUhVAmjmS0UAAADQS7mzGM8zXjMNq42ZeFEvJ2ERWsbtjMMinHzUYB2T0F6YmXPsD1QlgGYEigAAAP10Vmg9k7CYfbmJ83o5Cn/tTr38+6hejkNesBgDvSq0EyrOM18XW3u+V6UA8ujyDAAAMGzjW/5vVC/PGq7veVi0Qpzd8pp5WIzJ+DxznYctHfs883X7qglAPoEiAABAf51mvGZ0y/9NGmzrsl7+2fB34mtfZbxu7FQC9IdAEQAAoL9yJ1y5yahenmRuJ4aJ47AYL7Gpo4zX7IX2WgnmhK73VSWAfAJFAACA/pplvOZz3YmrBtuJoeCqYzbGsQm7Hurp8gzQgEARAACgv2YZr4mTntwUmFWZ24jjIE43sJ9jpxOgHwSKAAAA/RVb/73JeN31bscxYHyQ8XtxNudJz8torpoAlCVQBAAA6LeccQ3jWImjK38fZ667KrSP4y2Wz1wVAShLoAgAANBv07CYNCXndUs5YwbG2ZnPCuxfHBvxION1Z1ssQ5OyADQgUAQAAOi/44zXxFBv2fV5lPH6SaF9O8x83fstlp9JWQAaECgCAAD0XwwUc1opvgh54VmclXleYL9iy79J5mtnTiNAPwgUAQAA+i+27jvOfO0s3N0FeVpovyYhf/KXbZcfAJkEigAAAMMQA8WLjNftZbzmpMD+VPXyNPO10xbLJadF5pnqA5BPoAgAADAMsZVdVWA9F2H9FnsxxDtu8PqTFsvFhCsAhQkUAQAAhmNWLz+tuY75mr9fpf3Yy3z9q1BmvEYANkSgCAAAMCyTsN6YhLM1t/0y5IeJy99p04EqAVCWQBEAAGBYYnflw5A363Mp47AYh/BZw9+LrSnnLe5XbndnYygCNCBQBAAAGJ55WIR8bYeKVVi0aHxbLw8b/m4cq3HS8v7tZ77OLM8ADXypCAAAAAYptro7CosuyE3EVobjsAgK4zquh23x//bTz7019u8wtB/k7TcoKwAyCRQBAACGa5p+Ng0VD0K7Yw/+EDYT4o0zX6eFIkADujwDAAAM27Re/hk2O6bibX4IfwadbRtnvOZUFQFoRqAIAAAwfCdhEa6db3k/Nhkmxu7OOV2ydXcGaEigCAAAsBticBZDtudb2HZsHfn3sLkwMaoalAsADQgUAQAAdsskbLb7c+xSPAqbD+4OM183UyUAmhEoAgAA7J6TDWwjhpaxi/M4bH7SkxgmPsh43UW9zFUHgGYEigAAALunzUAxhnSxW/UobLaL81VHHSgHgMH6UhEAAADsnBikxRaEe4XWd5nWuVy2aVwvB5mvnaoKAM0JFAEAAHbTtF6e3vGaN2Ex5uIoLCZ0uS6OizgP3ZrYZJL5uotgQhaAlQgUAQAAdtNxuDtQfBQWLQ6noR/dg8dB60SA1hlDEQAAYDfN6+VVxuti8Ljfg+O5H5qFhFNVAGA1AkUAAIDdNcl4TRxncRoWgV3Xj+VB5mtjkDp3+gFWI1AEAADYXfOQ10rxYeh2i75xuLv79lUTpx5gdQJFAACA3TbJfF0cT3Hawf0fhWbjO2qdCLAmgSIAAMBum9fL88zXPgndChVjN+wYJu41+J2JUw6wHoEiAAAAceKVi8zXdilUjPvxsMHrY3A6d7oB1iNQBAAA4H29HDZ4fQwVZ2G7E7VMw6Ibdq4YmB471QDrEygCAAAQndXLjw1efxAWoeL+FvZ1GhahZhNVWASnAKxJoAgAAMBSbMH3qsHrY3fjWb0cbWj/7qftNQ0Tn6ffA6CAex8+fFAKAAAA/OHbb7+dhUULxCZOw6IV4Lyl3YotIeMELA+a7te///3vsbMKUI4WigAAAFwXx1M8b/g7MYD8T1h0Rx4V3JfYKjG2nPwlNA8TL0KzsSEByCBQBAAA4Lo41uA4NA8Vo9gdeRksrjO+4qheJmHR4vHpCr9/GRZhonETAQr7UhEAAABwg2WoOAuLsRKbepKW2ErwJK1nFm4P+PbTEoPAR2vs+2Xa9zOnEaA8gSIAAACfswwVY5fjJyuuI3ZTfhr+bGUYw76bgr6DQvssTARomUARAACA28RQsUo/nxZY314oFx5eJ0wE2ABjKAIAAJDjqF5+CIvQrouEiQAbIlAEAAAg1zSsPllLm+L+xLEXhYkAGyBQBAAAoIkY2sXw7nlH9uensAg5504NwGYIFAEAAFjFpF7+Vi+nW9p+nD36u7Doiv3e6QDYHIEiAAAAq5qHRevAGOxtKliMYyXG1pGxleTMKQDYPIEiAAAA65qFP4PFNy1tYxkkjsKidaRWiQBb8qUiAAAAoJBZWu7XS1Uvh/VysMb6LtP6TsJiQhgAOkCgCAAAQGmx9eBxWmK4GLsnj9PP5d/3rv1ODA/jhC/ztMyCLs0AnXTvw4cPSgEAAAAAyGIMRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACyCRQBAAAAgGwCRQAAAAAgm0ARAAAAAMgmUAQAAAAAsgkUAQAAAIBsAkUAAAAAIJtAEQAAAADIJlAEAAAAALIJFAEAAACAbAJFAAAAACCbQBEAAAAAyCZQBAAAAACy/T8BBgDL/zddBSAwEwAAAABJRU5ErkJggg==" /></div>' +
        '<div class="title">Email Scrubbing Report</div>' + pdfHeaderTemplate + css + tableString + pdfFooterTemplate;

    log.info('html generation completed');

    return new promise(function (resolve, reject) {
        log.info('Calling pdf.create');
        pdf.create(html, options).toFile(cleanDirectory + 'report.pdf', function (err, res) {
            if (err) {
                log.error('ERROR in PDF creation!', err);
                reject(err);
            }
            else {
                log.info('PDF creation completed. Calling resolve()');
                resolve();
            }
        });
    });

};

let keyValueRow = (key, value, noWidth) => {
    return [
        '<tr>',
        '<td ' + (noWidth ? '' : 'width=60%') + '>' + key + '</td>',
        '<td ' + (noWidth ? '' : 'width=40%') + '>' + value + '</td>',
        '</tr>'
    ].join('');
};

let pdfHeaderTemplate = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<title>VerifyRocket</title>',
    '</head>',
    '<body>'
].join('');

let css = [
    '<style>',
    '.title {text-align: center; margin: 10px 0px 50px 0px;font-size: 18px; font-weight: bold; color: #F1605A}',
    'body {font-family:Verdana,Georgia,Serif; color: #4B4B4B; }',
    'table {width: 100%;font-size:10px; margin: 15px 0px; }',
    'table.border-table { border-collapse:collapse; border: thin solid #D2D2D2;}',
    'table.border-table td { border:thin solid #D2D2D2; }',
    'thead { font-weight: bold; }',
    '</style>'
].join('');

let pdfFooterTemplate = [
    '</body>',
    '</html>',
].join('');

module.exports = {
    saveReports: saveReports
};
