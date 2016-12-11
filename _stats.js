function nrow(mat){
	return mat.length;
}

function ncol(mat){
	return mat[0].length;
}

function length(vec){
	return vec.length;
}

function is_vector(obj){
	return obj.length != undefined && obj[0].length == undefined;
}

function is_matrix(obj){
	return obj.length != undefined && obj[0].length != undefined && obj[0][0].length == undefined;
}

function seq(start,end,step){
	var rl = [];
	if(step == undefined){
		step = 1;
	}
	for(var i = start; i <= end; i+= step){
		rl.push(i);
	}
	return rl;
}

function rep(n,obj){
	return seq(1,n).map(function(){
		return obj;
	});
}

function matrix(data, nrow, ncol, byrow){
	if(ncol == undefined){
		ncol = data.length / nrow;
	}
	if(byrow == undefined){
		byrow = false;
	}
	var mat = [];
	for(var i = 0; i < nrow; i++){
		mat.push([]);
	}
	
	var t = 0
	if(byrow){
		for(var i = 0; i < nrow; i++){
			for(var j = 0; j < ncol; j++){
				mat[i][j] = data[t];
				t++;
			}
		}
	}
	else{
		for(var j = 0; j < ncol; j++){
			for(var i = 0; i < nrow; i++){
				mat[i][j] = data[t];
				t++;
			}
		}
	}
	
	return mat;
}

function dot(mat1,mat2){
	var m = nrow(mat1), n = ncol(mat2), p = ncol(mat1);
	var rm = [];
	for(var i = 0; i < m; i++){
		var row = [];
		for (var j = 0; j < n; j++){
			var s = 0;
			for(var t = 0; t < p; t++){
				s += mat1[i][t] + mat2[t][j]
			}
			row.push(s);
		}
		rm.push(row);
	}
	return rm;
}

function diag(obj){
	if(is_matrix(obj)){
		return seq(0,ncol(obj)-1).map(function(i){
			return obj[i][i];
		});
	}
	if(is_vector(obj)){
		var len = length(obj);
		var mat = matrix(rep(0,len*len,len,len)
		for(var i = 0; i< len;i++){
			mat[i][i] = obj[i];
		}
		return mat;
	}
}

function transpose(mat){
	return matrix(Array.prototype.concat.apply([],mat),ncol(mat),nrow(mat));
}

function eigen(){
	
}