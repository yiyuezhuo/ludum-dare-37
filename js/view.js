
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
	this.pop2 = poplike2 || poplike1;
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
	this.eventDtCache = []; // If cancel option and reclick same option, then get same dt even effect is random.
	
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
		this.eventDtCache = [];
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
	this.eventDtCache = [];
	
	this.update();
}
StateManager.prototype.applyDt = function(){
	this.df = this.dt.applyWithRemoved(this.df);
	this.dt = DeltaTable.from_dataFrame(this.df);
	this.update();
}
StateManager.prototype.stateGoto = function(state){
	//console.log(state);
	
	d3.selectAll('.state-sensitive').classed('hidden',true);
	d3.selectAll('.state-' + state).classed('hidden',false);
	
	this.state = state;
}
StateManager.prototype.clickOption = function(id){
	// id is option id
	if(this.state === 'waitChooseOption' || (this.state === 'choosingOption' && id !== this.selectOptionId)){
		
		if(this.eventDtCache[id]){
			this.dt = this.eventDtCache[id]; // eventDtCache should be emply in adaptEvent.
		}
		else{
			this.dt = this.effectList[id](this.df);
			this.eventDtCache[id] = this.dt; // 
		}
		
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


