const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname + "/files/");
const map = new Map();


function readFile(filePath, fileName) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) reject(err);
            const words = [];
            words.push(...data.split(/(?:,| |\.)+/));
            words.forEach(word => {
                if(word === '') return;
                if (!map.has(word)) {
                    map.set(word, new Set([fileName]))
                } else {
                    map.get(word).add(fileName)
                }
            });
            resolve();
        });
    });
}

const fileLoads = [];

for (var i in files) {
    fileLoads.push(readFile(__dirname + "/files/" + files[i], files[i]));
}

Promise.all(fileLoads).then(() => {
    console.log(map);
});



