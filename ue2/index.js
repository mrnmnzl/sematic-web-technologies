const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');
const sw = require('stopword');
const _ = require('underscore');
const Filequeue = require('filequeue');

const fq = new Filequeue(200);
const files = fs.readdirSync(__dirname + "/corpus/");
let numDocuments = files.length;
const map = new Map();
let tracker = 0;
const fileLoads = [];

//console.log("Number of Docs: " + numDocuments);

function readFile(filePath, fileName) {
    return new Promise((resolve, reject) => {
        fq.readFile(filePath, 'utf8', (err, data) => {
            if (err) reject(err);

            let words = [];
            words.push(...data.split(/(?:,| |\.|-)+/));
            words = sw.removeStopwords(words);
            const numWordsinDocument = words.length;

            words.forEach(word => {
                if(word === '') return;
                word = word.toLowerCase();
                if (!map.has(word)) {
                    map.set(word, {idf: 0, files: {fileName: {name: fileName, termCount: 1, wordCount: numWordsinDocument}}});
                } else {
                    if (map.get(word).files[fileName])
                        map.get(word).files[fileName].termCount++;
                    else {
                        map.get(word).files[fileName] = {name: fileName, termCount: 1, wordCount: numWordsinDocument};
                    }
                }
                const data = map.get(word);
                data.idf = numDocuments / Object.keys(data.files).length;
            });

            resolve();
        });
    });
}

//Promises werden in einem Array gespeichert
for (var i in files) {
    fileLoads.push(readFile(__dirname + "/corpus/" + files[i], files[i]));
}

//Es wird zuerst darauf gewartet, dass auch alle Files gelesen und indiziert wurden, bevor die Console gestartet wird
Promise.all(fileLoads).then(() => {
    startConsole();
});

function startConsole() {
    const answer = readlineSync.question('Enter query, empty to quit \n? '); 
    const searchTerms = sw.removeStopwords(answer.split(/(?:,| |\.|-)/));

    if (searchTerms === "") {
        //Exit the programm when no input was given
        console.log("Stoping programm...");
        console.log();
    }

    else if (searchTerms.length === 1) {
        const term = searchTerms[0];

        if(map.has(term)) {
            //The terms IDF
            const idf = map.get(term).idf;

            //Get all files that contain the term, sort them depending on the termCount
            let foundPosts = Object.values(map.get(term).files);
            foundPosts = _.sortBy(foundPosts, 'termCount').reverse();
            const numResults = Object.keys(foundPosts).length;

            //Check how many results you can display
            let numDisplayResults = 0;
            if (numResults > 5) {
                numDisplayResults = 5;
                console.log("\nFound " + numResults + " results, showing top 5");
                console.log("--------------------------------\n");
            } else {
                numDisplayResults = numResults;
                console.log("\nFound " + numResults + " results, showing all");
                console.log("--------------------------------\n");
            }
            
            //Display results
            for(let i = 0; i < numDisplayResults; i++) {
                const score = foundPosts[i].termCount * idf;
                console.log(foundPosts[i].name + ": score " + score.toFixed(2) + "\n");
            }
        } else {
            //If the term couldn't be found
            console.log("There are no results for " + term);
        }
        startConsole();
    } else {
        const foundResults = new Map();

        searchTerms.forEach(term => {   
            if(map.has(term)) {
                const idf = map.get(term).idf;

                let foundPosts = Object.values(map.get(term).files);
                foundPosts.forEach(post => {
                    if (!foundResults.has(post.name)) {
                        const score = idf * post.termCount;
                        foundResults.set(post.name, {filename: post.name, totalScore: score, terms: [{"term": term, "score": score}]});
                    } else {
                        const score = idf * post.termCount;
                        const entry = foundResults.get(post.name);
                        entry.terms.push({"term": term, "score": score});
                        entry.totalScore += score;
                    }                      
                });
            } 
        });

        let displayResults = [];
        for (let value of foundResults.values()) {
            displayResults.push(value);
        }
        displayResults = _.sortBy(displayResults, 'totalScore').reverse();

        const numResults = Object.keys(displayResults).length;

        //Check how many results you can display
        let numDisplayResults = 0;
        if (numResults > 5) {
            numDisplayResults = 5;
            console.log("\nFound " + numResults + " results, showing top 5");
            console.log("--------------------------------\n");
        } else {
            numDisplayResults = numResults;
            console.log("\nFound " + numResults + " results, showing all");
            console.log("--------------------------------\n");
        }
        
        //Display results
        for(let i = 0; i < numDisplayResults; i++) {
            const entry = displayResults[i];
            console.log(entry.filename + ": total score " + entry.totalScore.toFixed(2));
            entry.terms.forEach(term => {
                console.log(term.term + ": " + term.score.toFixed(2));
            });
            console.log();
        }
        
        startConsole();
    }
}

