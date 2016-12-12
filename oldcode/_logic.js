dataManager = { 'jsonp'  : undefined}

function jsonp_call(d){
	dataManager['jsonp'] = d;
	debug();
}

function loadScript(newJS){
		var scriptObj = document.createElement("script"); 
		scriptObj.src=newJS;
		document.getElementsByTagName("html")[0].appendChild(scriptObj);
}

loadScript("feudal.js");


var eventManager = (function(){
  function event(){
    
    var callbackList=[];
    
    function register(func){
      callbackList.push(func);
    }
    
    function trigger(){
      var i,
          length=callbackList.length;
      for(i=0;i<length;i++){
        if( callbackList[i].apply(this,arguments) ){
          break;
        }
      }
      //return triget.apply(this,arguments);
    }
    
    return {register  : register,
            trigger   : trigger};
  }
  
  return {clickOption : event(),
		  sampleClick : event(),
		  sampleSort : event(),
		  killClick : event(),
		  nextAge : event(),
		  cancelOption : event()};

}());


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


function SampleViewer(domHeader, domValue, df, dt, config) {
	this.domHeader = domHeader;
	this.domValue = domValue;
	this.df = df;
	this.dt = dt;
	this.config = config || {height : 5};
}
SampleViewer.prototype.update = function(){

	var domHeader = this.domHeader,
		domValue = this.domValue,
		header = this.df.header,
		dt = this.dt,
		value = dt.apply(this.df).as_matrix(),
		that = this,
		height = this.config.height;
		
	// click header will sort the matrix, click record will kill this one.
	// value is df.as_matrix result ((p,n) shape). It should be transposed before render it.
	// dt is delta table, if it given, domValue be modified by dt in this function.
	
	var width = 100/jStat.rows(value);
	height = height || 5;
	
	value = jStat.copy(value);
	
	d3.select(domHeader).selectAll('span').data(header)
		.enter().append('span')
			.style('width', width + '%')
			.style('height', height + '%')
			.text(function(h){
				return h.slice(0,5); // prevent the string is too long  
			})
			.on('click',function(h){
				//that.sortByHeader(h);
				//that.update();
				eventManager['sampleSort'].trigger(h);
			})
	
	var rowsData;
	if(!dt){
		rowsData = jStat.transpose(value).map(function(matRow,i){
			var cellData = matRow.map(function(matCell,j){
				return {value: matCell, change:0};
			})
			return {isRemoved:0, cellData:cellData, rowId : i};
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
			return {isRemoved: removed, cellData:cellData, rowId : i};
		})
	}
	
	var rows = d3.select(domValue).selectAll('span.row').data(rowsData);
	rows.enter().append('span').classed('row', true)
		.style('width','100%')
		.style('height', height + '%')
		.classed("matrix", true)
		.on('click',function(d){
			eventManager['sampleClick'].trigger(d.rowId);
		});
	rows.transition();
	rows.exit().remove();
	
	d3.select(domValue).selectAll('span.row').data(rowsData).classed('isRemoved', function(rowData){
		return rowData.isRemoved;
	});

			
	d3.select(domValue).selectAll('span.row').each(function(d){
		var cols = d3.select(this).selectAll('span.cell').data(d.cellData)
		
		cols.enter().append('span').classed('cell', true)
			.style('width', width + '%')
			.style('height', '100%')
			.text(function(d){
				return format(d.value);
			})
		cols.transition()
			.text(function(d){
				return format(d.value);
			})
		cols.exit().remove();
		
		d3.select(this).selectAll('span.cell').data(d.cellData)
			.classed('isAdd',function(d){
				return d.change > 0;
			})
			.classed('isSub',function(d){
				return d.change < 0;
		})
		
	})		
}




function MatrixViewer(domMap, poplike1, poplike2){
	// This class is linked too more element. I use domMap to direct access them.
	this.domMap = domMap;
	this.pop1 = poplike1;
	this.pop2 = pop2 || poplike1;
}
MatrixViewer.prototype.update = function(){
	var pop1 = this.pop1,
		pop2 = this.pop2,
		domMap = this.domMap;
		
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

function SituationViewer(component,pop, df, dt, speed){
	this.matrixViewer = component.matrixViewer;
	this.sampleViewer = component.sampleViewer;

	this.pop = pop;
	this.df = df;
	this.dt = dt;
	
	this.speed = speed;
}
SituationViewer.prototype.update = function(){
	// All `update` method should be implemented non parameter. 
	// The equivalence behaviour should be done by state write.
	var pop = this.pop;
	var df = this.df;
	var dt = this.dt;
	
	var pop2 = new Population(pop, dt.applyWithRemoved(df), this.speed);
	this.matrixViewer.pop1 = pop;
	this.matrixViewer.pop2 = pop2;
	this.matrixViewer.update();
	
	this.sampleViewer.df = df;
	this.sampleViewer.dt = dt;
	this.sampleViewer.update();
}

function EventChainViewer(domMap, title, image, content, option){
	// lower class EventChainViewer don't need know event meaning.
	this.domMap = domMap;
	this.title = title;
	this.image = image;
	this.content = content;
	this.option = option;
}
EventChainViewer.prototype.update = function(){
	d3.select(this.domMap['ng-main-title']).select('span').text(this.title);
	d3.select(this.domMap['ng-main-image']).attr('src',this.image);
	d3.select(this.domMap['ng-main-content']).select('span').text(this.content);
	
	// option ~ [{id:0,value:"Shout me!"},...,]
	var optionSpan = d3.select(this.domMap['ng-main-option']).selectAll('span.option').data(this.option);
	optionSpan.enter().append('span')
		.classed('option',true)
		.append('span')
		.text(function(d){
			return d.value;
		})
		.on('click', function(d){
			//console.log('click',d);
			eventManager['clickOption'].trigger(d.id);
		})
	optionSpan.transition()
		.select('span')
		.text(function(d){
			return d.value;
		})
	optionSpan.exit().remove();
	
}

function KillingViewer(domMap, killLimit, killing){
	this.domMap = domMap;
	this.killLimit = killLimit;
	this.killing = killing;
}
KillingViewer.prototype.update = function(){
	d3.select(this.domMap['ng-left-killing']).text(this.killing);
	d3.select(this.domMap['ng-left-killLimit']).text(this.killLimit);
}

function StateManager(config){
	// config:
	// relative by eventChainViewer
	// eventChainViewer, title, image, content, option
	// relative by situationViewer
	// situationViewer, pop, df, dt
	
	this.pop = config.pop;
	this.df = config.df;
	this.dt = config.dt;
	
	this.title = config.title;
	this.image = config.image;
	this.content = config.content;
	this.option = config.option;
	
	this.size = config.size || 100; // sample size
	this.speed = config.speed || 0.1; // pop change speed
	
	this.eventList = config.eventList || [];
	this.eventResidual = this.eventList.slice();
	this.effectList = undefined;
	
	
	this.killLimit = 5;
	this.killing = 0;
	
	this.eventChainViewer = config.eventChainViewer;
	this.situationViewer = config.situationViewer;
	this.killingViewer = config.killingViewer;
		
	eventManager['clickOption'].register(this.clickOption.bind(this));
	eventManager['sampleClick'].register(this.sampleClick.bind(this));
	eventManager['sampleSort'].register(this.sampleSort.bind(this));
	eventManager['killClick'].register(this.killClick.bind(this));
	eventManager['nextAge'].register(this.nextAge.bind(this));
	eventManager['cancelOption'].register(this.cancelOption.bind(this));
	
	this.state = undefined; //['waitChooseOption','choosingOption,killing,waitResample']
	//this.stateGoto('waitChooseOption');
	this.rollEvent();
	this.selectOptionId = undefined;
}
StateManager.prototype.update = function(){
	this.situationViewer.pop = this.pop;
	this.situationViewer.df = this.df;
	this.situationViewer.dt = this.dt;
	this.situationViewer.speed = this.speed;
	
	this.situationViewer.update();
	
	// TODO : event state transition
	this.eventChainViewer.title = this.title;
	this.eventChainViewer.image = this.image;
	this.eventChainViewer.content = this.content;
	this.eventChainViewer.option = this.option;

	this.eventChainViewer.update();
	
	this.killingViewer.killing = this.killing;
	this.killingViewer.killLimit = this.killLimit;
	this.killingViewer.update();
	
}
StateManager.prototype.sortByHeader = function(h){
	
	var header = this.df.header;
	
	var v = jStat.transpose(this.df.as_matrix());
	var idx = header.indexOf(h);
	var cmp = function(left, right){
		return right[idx] - left[idx];
	};
	var rv = rank(v,cmp);
	this.df = this.df.sortByIndex(rv);
	this.dt = this.dt.sortByIndex(rv);
	
}
StateManager.prototype.rollEvent = function(){
	// run until a event match condition or eventResidual is exhauseted
	var testEvent;
	while(this.eventResidual.length > 0){
		testEvent = this.eventResidual.shift();
		if(testEvent.cond.event(this.df)){
			break;
		}
		testEvent = undefined;
	}
	
	if(testEvent){
		this.stateGoto('waitChooseOption');
	}
	else{
		this.stateGoto('killing');
	}
	
	this.adaptEvent(testEvent); 
}
StateManager.prototype.adaptEvent = function(rawEvent){
	// rawEvent will remove some condition option that not match condition and transform to with-id object form.
	var that = this;
	
	if(rawEvent === undefined){
		this.option = [];
		this.content = '';
		this.title = '';
		this.image = '';
		
		this.effectList = undefined;
		this.update();
		return;
	}
	
	this.option = rawEvent.desc.option.map(function(value,i){
		return {id: i, value: value};
	}).filter(function(value, i){
		return rawEvent.cond.option[i](that.df);
	});
	this.content = rawEvent.desc.content;
	this.title = rawEvent.desc.title;
	this.image = rawEvent.desc.image;
	
	this.effectList = rawEvent.effect;
	
	this.update();
}
StateManager.prototype.applyDt = function(){
	this.df = this.dt.applyWithRemoved(this.df);
	this.dt = DeltaTable.from_dataFrame(this.df);
	this.update();
}
StateManager.prototype.stateGoto = function(state){
	console.log(state);
	
	d3.selectAll('.state-sensitive').classed('hidden',true);
	d3.selectAll('.state-' + state).classed('hidden',false);
	
	this.state = state;
}
StateManager.prototype.clickOption = function(id){
	// id is option id
	if(this.state === 'waitChooseOption' || (this.state === 'choosingOption' && id !== this.selectOptionId)){
		this.dt = this.effectList[id](this.df);
		
		this.update();
		
		this.selectOptionId = id;
		this.stateGoto('choosingOption')
	}
	else if(this.state === 'choosingOption'){
		this.applyDt();
		
		this.selectOptionId = undefined;
		
		this.rollEvent(); // ont of its effect is move state to "waitChooseOption" or "killing"
	}
}
StateManager.prototype.sampleClick = function(rowId){
	// rowId is row id of jStat.transpose(df.as_matrix()) 
	
	if(this.state === 'killing'){
		
		if(this.dt.isRemoved[rowId]){
			this.killing -= 1;
			this.dt.isRemoved[rowId] = 0;
		}
		else if(this.killing < this.killLimit){
			this.killing += 1;
			this.dt.isRemoved[rowId] = 1;
		}
		
		this.update();
	}
}
StateManager.prototype.sampleSort = function(h){
	// h is element of df header
	this.sortByHeader(h);
	this.update();
}
StateManager.prototype.killClick = function(){
	if(this.state === 'killing'){
		this.applyDt();
		this.stateGoto('waitResample');
	}
}
StateManager.prototype.nextAge = function(){
	if(this.state === 'waitResample' || this.state === 'killing'){
		this.pop = new Population(this.pop, this.df, this.speed);
		this.df = this.pop.sample(this.size);
		this.dt = DeltaTable.from_dataFrame(this.df);
		
		// resume state
		this.eventResidual = this.eventList.slice();
		this.killing = 0;
		
		this.update();
		
		this.rollEvent();
	}
}
StateManager.prototype.cancelOption = function(){
	if(this.state === 'choosingOption'){
		this.stateGoto('waitChooseOption');
		this.dt = DeltaTable.from_dataFrame(this.df);
		this.update();
	}
}


// debug field
function debug(){
	dat = dataManager['jsonp'];
	df = new DataFrame(dat.header,dat.type,dat.values);
	pop = new Population(df);
	df2 = pop.sample(100);
	pop2 = new Population(df,df2,0.1);
	df3 = pop.sample(100);
	pop3 = new Population(df,df2,0.2)

	
	domMap = {};
	['ng-matrix-names','ng-matrix-mu','ng-matrix-mu-change',
	 'ng-matrix-variance','ng-matrix-variance-change','ng-matrix-correlation',
	 'ng-matrix-correlation-change','ng-sample-header','ng-sample-value',
	 'ng-main-title','ng-main-image','ng-main-content','ng-main-option',
	 'ng-left-killing','ng-left-killLimit'].map(function(className){
		 domMap[className] = document.getElementsByClassName(className)[0];
	})

	
	names = df.header.map(function(s){return s.slice(0,5)});
	
	
	sampleViewer = new SampleViewer(domMap['ng-sample-header'], domMap['ng-sample-value']);
	matrixViewer = new MatrixViewer(domMap);
	situationViewer =  new SituationViewer( {sampleViewer : sampleViewer,
											 matrixViewer : matrixViewer});
	
	eventChainViewer = new EventChainViewer(domMap);
	
	killingViewer = new KillingViewer(domMap);
	
					
	classFighter = {
		desc:{
			title : 'class fight',
			image : 'class_fight.png',
			content : 'The humble reactionist want to build communism in our great earth. What do you want to do?',
			option : ["Purge communist",
					  "Use law",
					  "Wealth relocate"]
		},
		cond: {
			event : function(df){return true;},
			option : [
				function(df){return true;},
				function(df){return true},
				function(df){return true}
			]
		},
		effect: [
			function(df){
				return DeltaTable.from_map(df, function(record){
					return {delta: {}, isRemoved: record.wealthy <0 ? 1 : 0};
				});
			},
			function(df){
				return DeltaTable.from_map(df, function(record){
					return {delta: {wealthy:record.wealthy < 0 ? -0.2 : 0.2 }, isRemoved: 0};
				});
			},
			function(df){
				return DeltaTable.from_map(df, function(record){
					return {delta: {wealthy:record.wealthy < 0 ? 0.2 : -0.2 }, isRemoved: 0};
				});
			}
		]
	}

	
	stateManager =  new StateManager({
		pop : pop,
		df : df2,
		dt : DeltaTable.from_dataFrame(df2),
		eventList : [classFighter],
		situationViewer : situationViewer,
		eventChainViewer : eventChainViewer,
		killingViewer : killingViewer
	});
	
	//stateManager.rollEvent();
	stateManager.update();
	
	document.getElementsByClassName('debug')[0].onclick = function(){
		stateManager.df = df3;
		stateManager.update();
	}
	
	document.getElementsByClassName('Kill')[0].onclick = function(){
		eventManager['killClick'].trigger();
	}
	
	document.getElementsByClassName('nextAge')[0].onclick = function(){
		eventManager['nextAge'].trigger();
	}
	
	document.getElementsByClassName('cancel')[0].onclick = function(){
		eventManager['cancelOption'].trigger();
	}



}