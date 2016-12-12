var eigen = jStat.jacobi;

function rnorm(n, mean, sd){
	if(mean == undefined){
		mean = 0;
	}
	if(sd == undefined){
		sd = 1;
	}
	return jStat.arange(n).map(function(){ 
		return jStat.normal.sample(mean,sd);
	});
}

function rmultinorm(n,mu,sigma){
	var p = mu.length;
	var res = eigen(sigma);
	var sqrt_Lambda = jStat.diagonal(res[1].map(Math.sqrt));
	var P = res[0];
	var trans = jStat.multiply(P,sqrt_Lambda);
	var base = [];
	for(var i = 0; i < p; i++){
		base.push(rnorm(n));
	}
	var mat = jStat.multiply(trans, base);
	for(i = 0; i < p; i++){
		for(j = 0; j < n; j++){
			mat[i][j] += mu[i];
		}
	}
	return mat;

}

function cov(mat){
	// mat is (p,n) matrix not the R style
	mat = jStat.copy(mat);
	var m = jStat.rows(mat), n = jStat.cols(mat), i, j;
	var mu = jStat.arange(m).map(function(i){
		return jStat.mean(jStat.row(mat,i));
	})
	for(i = 0; i < m; i++){
		for(j = 0; j < n; j++){
			mat[i][j] -= mu[i];
		}
	}
	return jStat.multiply(jStat.multiply(mat,jStat.transpose(mat)),1/(jStat.cols(mat)-1));
}

function cor(mat){
	var c = cov(mat);
	var trans = jStat.diagonal(jStat.arange(jStat.rows(mat)).map(function(i){
		return 1/Math.sqrt(c[i][i]);
	}));
	return jStat.multiply(jStat.multiply(trans,c),trans);
}

function apply(mat, margin, func){
	if(margin == 1){
		return mat.map(func);
	}
	else if(margin == 2){
		return jStat.transpose(mat).map(func);
	}
}

function rank(l,cmp){
	if(cmp === undefined){
		cmp = function(l,r){
			return l - r;
		}
	}
	var ll = l.map(function(obj,i){
		return [i,obj];
	});
	ll.sort(function(l,r){
		return cmp(l[1],r[1]);
	});
	return ll.map(function(t){
		return t[0];
	})
}

function sortByIndex2(l,index){
	// [-2,-1..],[1,0,..] -> -2 will move to index 1 location,-1 will move to index 0 location
	var ll = l.map(function(obj,i){
		return [index[i],obj];
	});
	return ll.sort(function(l,r){
		return l[0] - r[0];
	}).map(function(pair){
		return pair[1];
	});
}

function sortByIndex(l,index){
	// [-2,-1..],[1,0,..]  -> index 1 location will store -1, index 0 location will store -2
	var rl = []
	l.forEach(function(obj,i){
		rl[i] = l[index[i]];
	});
	return rl;
}