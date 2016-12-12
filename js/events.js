eventList = [
	{
		desc:{
			title : 'class fight',
			image : 'img/class_fight.png',
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
	},
	{
		desc:{
			title: "Hello world!",
			image: '',
			content: 'Do you hear program sing?',
			option: [
				'Would you like some charge?',
			]
		},
		cond:{
			event: function(df){return true;},
			option: [
				function(df){
					return true;
				},
			]
		},
		effect:[
				function(df){
					return DeltaTable.from_dataFrame(df);
				},
		]
	},
]