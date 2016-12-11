dataManager = {}

function jsonp_call(d){
	dataManager['jsonp'] = d;
	debug();
}

function loadScript(newJS){
		var scriptObj = document.createElement("script"); 
		scriptObj.src=newJS;
		document.getElementsByTagName("html")[0].appendChild(scriptObj);
}

loadScript("mao.js");

var DataFrame = function(header, type, values){
	this.header = header;
	this.type = type;
	if(values != undefined){
	}
	else if(header != undefined){
		values = {}
		header.forEach(function(h){
			values[h] = [];
		});
	}
	else{
		values = {};
	}
	this.values = values;
}
DataFrame.prototype.as_matrix = function(){
	// return (p,n) matrix not the R style (n,p) matrix
	var that = this;
	return this.header.filter(function(h){
		return that.type[h] == 'number';
	}).map(function(h){
		return that.values[h] 
	}); 
}
DataFrame.from_matrix = function(header, type, mat){
	// matrix is same as_matrix result (p,n) shape
	var df = new DataFrame(header, type);
	df.header.forEach(function(h,i){
		df.values[h] = mat[i];
	})
	return df;
}
DataFrame.prototype.cov = function(){
	return cov(this.as_matrix())
}
DataFrame.prototype.cor = function(){
	return cor(this.as_matrix())
}
DataFrame.prototype.mean = function(){
	return this.as_matrix().map(function(arr){
		return jStat.mean(arr);
	})
}
DataFrame.prototype.insert = function(record){
	// record is object that include same key as header
	var that = this;
	Object.keys(record).forEach(function(h){
		that.values[h].push(record[h]);
	});
}
DataFrame.prototype.delete = function(cond){
	// cond is logic function, if a record is got true from it, it will be deleted.
	var that = this;
	var mat = jStat.transpose(this.as_matrix()).filter(function(row){
		var record = {};
		row.forEach(function(value,i){
			record[that.header[i]] = value;
		});
		return !cond(record);
	});
	jStat.transpose(mat).forEach(function(row,i){
		that.values[that.header[i]] = row;
	});
}
DataFrame.prototype.size = function(){
	return this.values[this.header[0]].length;
}
DataFrame.prototype.select = function(cond){
	var that = this;
	var mat = jStat.transpose(this.as_matrix()).filter(function(row){
		var record = {};
		row.forEach(function(value,i){
			record[that.header[i]] = value;
		});
		return cond(record);
	});
	
	var df = new DataFrame(this.header,this.type);
	//df.header = this.header;
	//df.type = this.type;
	//df.values = {};
	
	jStat.transpose(mat).forEach(function(row,i){
		df.values[that.header[i]] = row;
	})
	
	return df;
}
DataFrame.prototype.copy = function(){
	var df = new DataFrame(this.header,this.type);
	//df.header = this.header;
	//df.type = this.type;
	//df.values = {};
	var that = this;
	Object.keys(this.values).forEach(function(h){
		df.values[h] = that.values[h].copy();
	});
	return df;
}

function DeltaTable(header, type, values, isRemoved){
	
	DataFrame.call(this, header, type, values);
	
	this.isRemoved = isRemoved; // vector, is same size on df
}
DeltaTable.prototype = Object.create(DataFrame.prototype);
DeltaTable.from_matrix = function(header, type, mat, isRemoved){
	var dt = new DeltaTable(header, type);
	dt.header.forEach(function(h,i){
		dt.values[h] = mat[i];
	})
	dt.isRemoved = isRemoved;
	return dt;
}
DeltaTable.prototype.apply = function(df){
	// only number modified, not remove
	return DataFrame.from_matrix(df.header, df.type, jStat.add(df.as_matrix(), this.as_matrix()));
}
DeltaTable.prototype.applyWithRemoved = function(df){
	// number modified, not remove
	var that = this;
	var raw = jStat.add(df.as_matrix(), this.as_matrix());
	var mat = jStat.transpose(jStat.transpose(raw).filter(function(row,i){
		return !that.isRemoved[i];
	}));
	return DataFrame.from_matrix(df.header, df.type, mat);
}


var Population = function(df1,df2,k){
	// Anyway, df1,df2 can be both DataFrame and Population. Or any have `mean`,`cov`,`header`,`type` ones.
	
	this.params = {};
	
	this.header = df1.header;
	this.type = df1.type;
	
	if(df2 == undefined){
		this.params.mean = df1.mean();
		this.params.cov = df1.cov();
	}
	else{
		// k = k || 0.1;
		this.params.mean = jStat.add(jStat.multiply(df1.mean(),1-k), jStat.multiply(df2.mean(),k));
		this.params.cov = jStat.add(jStat.multiply(df1.cov(),1-k), jStat.multiply(df2.cov(),k));
	}
	
}
Population.prototype.cov = function(){
	return this.params.cov;
}
Population.prototype.cor = function(){
	var c = this.params.cov;
	var trans = jStat.diagonal(jStat.arange(jStat.rows(c)).map(function(i){
		return 1/Math.sqrt(c[i][i]);
	}));
	return jStat.multiply(jStat.multiply(trans,c),trans);
}
Population.prototype.mean = function(){
	return this.params.mean;
}
Population.prototype.sample = function(size){
	var mat = rmultinorm(size,this.mean(),this.cov());
	var df = new DataFrame(this.header,this.type);
	//df.type = this.type;
	//df.header = this.header;
	mat.forEach(function(row,i){
		df.values[df.header[i]] = row;
	})
	return df;
}

function streesNumber(n){

	if(Math.abs(n)<1e-5){
		return '0';
	}
	if(Math.abs(1-n)<1e-5){
		return '1';
	}

	exp = n.toExponential().split('e');
	
	if(n.toPrecision().length<5){
		return n.toPrecision();
	}
	
	if(Math.abs(Number(exp[1]))>5){
		if (exp[0].length > 3){
			exp[0] = exp[0].slice(0,3);
		}
		return exp[0] + 'e' + exp[1];
	}
	
	return n.toPrecision().slice(0,6);
}

function formatNumber(n){
	var s = streesNumber(n);
	if(s[0] !== '-'){
		return ' '+s;
	}
	return s;
}

function format(obj){
	if(isNaN(Number(obj))){
		return obj;
	}
	return formatNumber(obj);
}

function printMatrix(ctx, mat, left, top, width, height){
	left = left || 10;
	top = top || 20;
	width = width || 50;
	height = height || 30;
	var m = jStat.rows(mat), n = jStat.cols(mat);
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = 'Consolas';
	for(var i = 0; i < m; i++){
		for(var j = 0; j < n; j++){
			var s = format(mat[i][j]);
			ctx.fillText(s, j*width + left, i*height + top);
		}
	}
}

function drawMatrix(dom, mat, names, config){
	var m = jStat.rows(mat), n = jStat.cols(mat);
	var dl = [];
	if(names != undefined){
		mat.unshift(names);
		m += 1;
	};
	for(var i = 0; i < m; i++){
		for(var j = 0; j < n; j++){
			dl.push({d:format(mat[i][j]) });
		}
	}
	
	if(!config){
		config = {};
	}
	if(!config.width){
		config.width = 100/n;
	}
	if(!config.height){
		config.height = 100/m;
	}

	var cells = d3.select(dom).selectAll('span').data(dl);
	cells.enter().append('span')
		.attr('class', 'matrix-cell')
		.style('width', config.width + '%')
		.style('height', config.height + '%')
		.text(function(d){
			return d.d;
		});
	cells.transition().text(function(d){
			return d.d;
		});
	cells.exit().remove();
		
}

function drawSample(domHeader, header, domValue, value, dt, height){
	// click header will sort the matrix, click record will kill this one.
	// value is df.as_matrix result ((p,n) shape). It should be transposed before render it.
	// dt is delta table, if it given, domValue is modified by dt before call this function.
	var width = 100/jStat.rows(value);
	height = height || 5;
	
	value = jStat.copy(value);
	
	d3.select(domHeader).selectAll('span').data(header)
		.enter().append('span')
			.style('width', width + '%')
			.style('height', height + '%')
			.text(function(h){return h;})
			.on('click',function(h){
				v = jStat.transpose(value);
				var idx = header.indexOf(h);
				v.sort(function(left, right){
					return right[idx] - left[idx];
				})
				drawSample(domHeader, header, domValue, jStat.transpose(v), height);
			})
	
	var rowsData;
	if(!dt){
		rowsData = jStat.transpose(value).map(function(matRow,i){
			var cellData = matRow.map(function(matCell,j){
				return {value: matCell, change:0};
			})
			return {isRemoved:false, cellData:cellData};
		})
	}
	else{
		var deltaMat = jStat.transpose(dt.as_matrix());
		rowsData = jStat.transpose(value).map(function(matRow,i){
			var removed = dt.isRemoved[i];
			var cellData;
			if(removed){ // not show change color
				cellData = matRow.map(function(matCell,j){
					return {value: matCell, change: 0};
				})
			}
			else{
				cellData = matRow.map(function(matCell,j){
					return {value: matCell, change: deltaMat[i][j]};
				})
			}
			return {isRemoved: removed, cellData:cellData};
		})
	}
	
	var rows = d3.select(domValue).selectAll('span.row').data(rowsData);
	
	rows.enter().append('span').classed('row', true)
		.style('width','100%')
		.style('height', height + '%')
		.classed("matrix", true);
		/*
		.classed('isRemoved', function(rowData){
			return rowData.isRemoved
		})
		*/
	
	rows.transition();
		/*
		.classed('isRemoved', function(rowData){
			return rowData.isRemoved
		});
		*/
	
	rows.exit().remove();
	
	d3.select(domValue).selectAll('span.row').data(rowsData).classed('isRemoved', function(rowData){
		return rowData.isRemoved
	});

			
	d3.select(domValue).selectAll('span.row').each(function(d){
		var cols = d3.select(this).selectAll('span.cell').data(d.cellData)
		
		cols.enter().append('span').classed('cell', true)
			.style('width', width + '%')
			.style('height', '100%')
			.text(function(d){
				//console.log(d);
				return format(d.value);
			})
			/*
			.classed('isAdd',function(d){
				return d.change >0;
			})
			.classed('isSub',function(d){
				return d.change <0;
			})
			*/
			
		cols.transition()
			.text(function(d){
				return format(d.value);
			})
			/*
			.classed('isAdd',function(d){
				return d.change >0;
			})
			.classed('isSub',function(d){
				return d.change <0;
			})
			*/
		
		cols.exit().remove();
		
		d3.select(this).selectAll('span.cell').data(d.cellData)
			.classed('isAdd',function(d){
				console.log(d);
				return d.change > 0;
			})
			.classed('isSub',function(d){
				return d.change < 0;
		})
		 
	})		
}

function drawSampleDelta(df, dt){
	// df is old version.
	var df2 = dt.apply(df);
	drawSample(domMap['ng-sample-header'], names,
			   domMap['ng-sample-value'], df2.as_matrix());
	
}


function drawMatrixField(pop1, pop2){

	var names = pop1.header.map(function(s){return s.slice(0,5)});
	var namesCol = jStat.transpose([pop1.header]);
	
	function quickDraw(className, mat, names, config){
		drawMatrix(domMap[className], mat, names, config);
	}
	
	quickDraw('ng-matrix-names', namesCol, ['#']);
	quickDraw('ng-matrix-mu', jStat.transpose([pop1.mean()]), ['Expect']);
	quickDraw('ng-matrix-mu-change',jStat.transpose([jStat.subtract(pop2.mean(),pop1.mean())]), ['dE']);
	quickDraw('ng-matrix-variance', jStat.diag(pop1.cov()), ['Variance']);
	quickDraw('ng-matrix-variance-change', jStat.diag(jStat.subtract(pop2.cov(),pop1.cov())), ['dV']);
	quickDraw('ng-matrix-correlation', pop1.cor(), names);
	quickDraw('ng-matrix-correlation-change', jStat.subtract(pop2.cor(), pop1.cor()), names);
	
}

function drawSituation(pop, df){
	// df is sampled by pop or modified by one sampled by pop.
	// It give player  a view what is going on. And player choose a direction to next turn.
	var pop2 = new Population(pop, df, 0.1);
	drawMatrixField(pop, pop2);
	
	var names = df.header.map(function(s){return s.slice(0,5)});

	drawSample(domMap['ng-sample-header'], names,
			   domMap['ng-sample-value'], df.as_matrix());
	
}

// debug field
function debug(){
	dat = dataManager['jsonp'];
	df = new DataFrame(dat.header,dat.type,dat.values);
	pop = new Population(df);
	df2 = pop.sample(100);
	pop2 = new Population(df,df2,0.1);
	
	domMap = {};
	['ng-matrix-names','ng-matrix-mu','ng-matrix-mu-change',
	 'ng-matrix-variance','ng-matrix-variance-change','ng-matrix-correlation',
	 'ng-matrix-correlation-change','ng-sample-header','ng-sample-value'].map(function(className){
		 domMap[className] = document.getElementsByClassName(className)[0];
	})

	
	canvas = document.getElementById("screen");
	if(canvas!=null){
		ctx = canvas.getContext("2d");
		printMatrix(ctx,pop.cov());
	}
	
	df3 = pop.sample(200);
	pop3 = new Population(df,df2,0.2)
	
	
	drawMatrixField(pop,pop2);
	
	names = df.header.map(function(s){return s.slice(0,5)});
	//quickDraw('ng-sample', jStat.transpose(df2.as_matrix()), names, {'height':5});
	
	var dt_matrix = df3.as_matrix().map(function(row,i){
		return row.map(function(value,j){
			var r = Math.random();
			if(r<0.8){
				return 0;
			}
			else if(r < 0.9){
				return -1;
			}
			else{
				return 1;
			}
		})
	})
	var isRemoved = jStat.arange(df2.size()).map(function(){
		return Math.random() > 0.7 ? 1 : 0;
	});
	dt = DeltaTable.from_matrix(df.header, df.type, dt_matrix, isRemoved);
	dt.values[dt.header[0]][0] = 1;
	dt.values[dt.header[1]][0] = -1;
	dt.values[dt.header[2]][0] = 0;
	/*
	drawSample(domMap['ng-sample-header'], names,
			   domMap['ng-sample-value'], df2.as_matrix());
	*/
	drawSample(domMap['ng-sample-header'], names,
			   domMap['ng-sample-value'], df2.as_matrix(), dt);

	document.getElementsByClassName('debug')[0].onclick = function(){
		drawSituation(pop, df3);
	}
}