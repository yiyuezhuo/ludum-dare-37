function DataFrame(header, type, values){
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
DataFrame.prototype.sortByIndex = function(index){
	var mat = jStat.transpose(sortByIndex(jStat.transpose(this.as_matrix()),index));
	return DataFrame.from_matrix(this.header, this.type, mat);
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
	dt.isRemoved = isRemoved || 0;
	return dt;
}
DeltaTable.from_dataFrame = function(df){
	// construct a "unchanged" dt along with the df.
	var dt =  new DeltaTable(df.header, df.type);
	var alongArr = jStat.arange(df.size());
	dt.isRemoved = alongArr.map(function(){
		return 0;
	})
	dt.header.forEach(function(h){
		dt.values[h] = alongArr.map(function(){
			return 0;
		});
	});
	return dt;
}
DeltaTable.from_map = function(df, map){
	// map: {wealthy: 1, power:0,knowledge:0.5} -> {delta:{wealthy:0,power:0,knowledge:0.1},isRemoved:0}
	var dt = new DeltaTable(df.header, df.type);
	dt.isRemoved = [];
	var alongArr = jStat.arange(df.size());
	alongArr.forEach(function(i){
		var record = {};
		dt.header.forEach(function(h){
			record[h] = df.values[h][i];
		});
		var res = map(record);
		dt.isRemoved[i] = res.isRemoved;
		dt.header.forEach(function(h){
			dt.values[h][i] = res.delta[h] || 0;
		})
	})
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
DeltaTable.prototype.sortByIndex = function(index){
	var isRemoved = sortByIndex(this.isRemoved, index);
	var mat = jStat.transpose(sortByIndex(jStat.transpose(this.as_matrix()),index))
	return DeltaTable.from_matrix(this.header, this.type, mat, isRemoved);
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