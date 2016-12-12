console.log(process.argv);

nodePath = process.argv[0];
scriptPath = process.argv[1];
inputPath = process.argv[2] ||'future.csv';
outputPath = process.argv[3] || 'future.js';
funcName = process.argv[4] || 'jsonp_call';

fs = require('fs');

function readCsv(path){
	var records = fs.readFileSync(inputPath,'utf-8').split('\r\n').map((l)=>(l.split(',')));
	records.pop() // remove standard csv file null line
	
	var header = records.shift()
	var values = {}
	header.forEach((h)=>(values[h]=[]))
	var type = {}
	var size = records.length;
	var p = header.length;
	
	for(var i = 0; i < size;i ++){
		for(var j = 0; j < p; j++){
			var h = header[j];
			var v = records[i][j]
			if(type[h] === 'string'){
				values[h].push(v)
			}
			else if(isNaN(Number(v))){
				type[h] = 'string';
				values[h].push(h);
			}
			else{
				values[h].push(Number(v));
			}
		}
	}
	
	header.forEach(function(h){
		if(type[h] !== 'string'){
			type[h] = 'number';
		}
	})
	
	return {header:header,type:type,values:values};
}

function removeNonNumberFromCsv(df){
	df.header = df.header.filter(function(h){
		if(df.type[h] !== 'number'){
			delete df.values[h]
			delete df.type[h]
			return false;
		}
		return true;
	})
	return df;
}

function objectToJsonp(obj, outputPath, funcName){
	 var jsonpString = funcName + '(' + JSON.stringify(obj) + ')';
	 fs.writeFileSync(outputPath, jsonpString);
}

dat = removeNonNumberFromCsv(readCsv(inputPath));
objectToJsonp(dat, outputPath, funcName);

console.log(inputPath,'->',outputPath);