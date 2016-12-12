dataManager = { 'jsonp'  : undefined}

function jsonp_call(d){
	dataManager['jsonp'] = d;
	//debug();
	setup();
}

function loadScript(newJS){
	var scriptObj = document.createElement("script"); 
	scriptObj.src=newJS;
	document.getElementsByTagName("html")[0].appendChild(scriptObj);
}

function parseParam(){
	var url=location.search; 
	var Request = new Object(); 
	if(url.indexOf("?")!=-1) { 
		var str = url.substr(1) //remove ? char 
		strs = str.split("&"); 
		for(var i=0;i<strs.length;i++) { 
			Request[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]); 
		} 
	}
	return Request;
}

var getParam = parseParam();

if(getParam['scenario']){
	loadScript('scenario/'+getParam['scenario']);
}
else{
	loadScript("scenario/feudal.js");
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

	
	//names = df.header.map(function(s){return s.slice(0,5)});
	
	
	sampleViewer = new SampleViewer(domMap['ng-sample-header'], domMap['ng-sample-value']);
	matrixViewer = new MatrixViewer(domMap);
	situationViewer =  new SituationViewer( {sampleViewer : sampleViewer,
											 matrixViewer : matrixViewer});
	
	eventChainViewer = new EventChainViewer(domMap);
	
	killingViewer = new KillingViewer(domMap);
	
	stateManager =  new StateManager({
		pop : pop,
		df : df2,
		dt : DeltaTable.from_dataFrame(df2),
		//eventList : [classFighter],
		eventList : eventList,
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

function setup(){
	
	var size = 100;
	
	var dat = dataManager['jsonp'];
	var df = new DataFrame(dat.header,dat.type,dat.values);
	var pop = new Population(df);
	var df2 = pop.sample(size);

	
	var domMap = {};
	['ng-matrix-names','ng-matrix-mu','ng-matrix-mu-change',
	 'ng-matrix-variance','ng-matrix-variance-change','ng-matrix-correlation',
	 'ng-matrix-correlation-change','ng-sample-header','ng-sample-value',
	 'ng-main-title','ng-main-image','ng-main-content','ng-main-option',
	 'ng-left-killing','ng-left-killLimit'].map(function(className){
		 domMap[className] = document.getElementsByClassName(className)[0];
	})

	
	//names = df.header.map(function(s){return s.slice(0,5)});
	
	
	var sampleViewer = new SampleViewer(domMap['ng-sample-header'], domMap['ng-sample-value']);
	var matrixViewer = new MatrixViewer(domMap);
	var situationViewer =  new SituationViewer( {sampleViewer : sampleViewer,
											 matrixViewer : matrixViewer});
	
	var eventChainViewer = new EventChainViewer(domMap);
	
	var killingViewer = new KillingViewer(domMap);
	
	var stateManager =  new StateManager({
		pop : pop,
		df : df2,
		dt : DeltaTable.from_dataFrame(df2),
		size : size,
		//eventList : [classFighter],
		eventList : eventList,
		situationViewer : situationViewer,
		eventChainViewer : eventChainViewer,
		killingViewer : killingViewer
	});
	
	//stateManager.rollEvent();
	//stateManager.update();
	
	/*
	document.getElementsByClassName('debug')[0].onclick = function(){
		stateManager.df = df3;
		stateManager.update();
	}
	*/
	
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