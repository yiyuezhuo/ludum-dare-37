function streesNumber(n){

	if(Math.abs(n) < 1e-5){
		return '0';
	}
	if(Math.abs(1-n) < 1e-5){
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

/*
function printMatrix(ctx, mat, left, top, width, height){
	// print martix by canvas
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
*/

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