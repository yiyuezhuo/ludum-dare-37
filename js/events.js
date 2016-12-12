eventList = [
	{
		desc:{
			title : 'Class fight',
			image : 'img/class_fight.png',
			content : 'The humble reactionist want to build order in our room. What do you want to do?',
			option : ["Purge",
					  "Use natrue law",
					  "Wealth relocate"]
		},
		cond: {
			event : function(df){return Math.random()<0.25;},
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
			title: "Hello room!",
			image: 'hello_room.png',
			content: " It's room control room, what do you want? ",
			option: [
				'Do you hear program sing?',
				'Would you like people rich?',
				'Would you like people love to study?',
				'Would you like people to self study?'
			]
		},
		cond:{
			event: function(df){return true;},
			option: [
				function(df){
					return true;
				},
				function(df){
					return true;
				},
				function(df){
					return true;
				},
				function(df){
					return true;
				}
			]
		},
		effect:[
			function(df){
				return DeltaTable.from_dataFrame(df);
			},
			function(df){
				return DeltaTable.from_map(df, function(record){
					return {delta: {wealthy:2}, isRemoved: 0};
				});
			},
			function(df){
				return DeltaTable.from_map(df, function(record){
					return {delta: {knowledge:2}, isRemoved: 0};
				});
			},
			function(df){
				return DeltaTable.from_map(df, function(record){
					return {delta: {knowledge:Math.random()>0.5 ? 3 : -3}, isRemoved:0}
				});
			}
		]
	},
	{
		desc:{
			title: "Achievement unlock: Rich room",
			image: "img/achievement_rich.png",
			content: "The people sampled in room is very wealthy!",
			option: [
				'$$$$$$$$$$$$$$$$$$$$$$$$$$$$',
			]
		},
		cond:{
			event:function(df){
				return df.values['wealthy'].filter(function(n){return n>1;}).length > 50;
			},
			option:[
				function(df){
					return true;
				}
			]
		},
		effect:[
			function(df){
				return DeltaTable.from_dataFrame(df);
			}
		]
	},
	{
		desc:{
			title: "Achievement unlock: Intelligent room",
			image: "img/achievement_Intelligent.png",
			content: "The people in the room is very smart!",
			option:[
				'So.... where is my calculus textbook?',
			]
		},
		cond:{
			event:function(df){
				return df.values['knowledge'].filter(function(n){return n>1}).length > 50;
			},
			option:[
				function(df){
					return true;
				}
			]
		},
		effect:[
			function(df){
				return DeltaTable.from_dataFrame(df);
			}
		]
	},
	{
		desc:{
			title: "Fool Suicide",
			image: "img/fool_suicide.png",
			content: "Some people are shamed by their low knowledge and decide to suicide",
			option:[
				"Sad",
			]
		},
		cond:{
			event:function(df){
				var c1 = df.values['knowledge'].filter(function(n){return n>1}).length > 10;
				var c2 = df.values['knowledge'].filter(function(n){return n<0.5}).length > 10;
				return c1 && c2;
			},
			option:[
				function(df){
					return true;
				},
			]
		},
		effect:[
			function(df){
				return DeltaTable.from_map(df,function(record){
					return {delta:{},isRemoved: record['knowledge']<0.5 && Math.random()<0.5 ? 1 : 0};
				})
			}
		]
	},
	{
		desc:{
			title: "assault!",
			image: "img/assault.png",
			content: "The leader of people is assaulted by mysterious.",
			option:[
				"Help investigate",
				"Interesting",
			]
		},
		cond:{
			event:function(df){
				return Math.random() < 0.20;
			},
			option:[
				function(df){
					return true;
				},
				function(df){
					return true;
				}
			]
		},
		effect:[
			function(df){
				var maxPower = Math.max.apply(null, df.values['power']);
				var minPower = Math.min.apply(null, df.values['power']);
				var medianPower = d3.median(df.values['power']);
				return DeltaTable.from_map(df,function(record){
					var res = {delta:{}};
					res['isRemoved'] = record['power'] === maxPower ? 1 : 0;
					res.delta['wealthy'] = record['power'] === minPower ? 0.5 : 0; 
					res.delta['power'] = record['power'] > medianPower && Math.random() > 0.5 ? 0.1 : 0;
					return res;
				});
			},
			function(df){
				var maxPower = Math.max.apply(null, df.values['power']);
				var minPower = Math.min.apply(null, df.values['power']);
				var medianPower = d3.median(df.values['power']);
				return DeltaTable.from_map(df,function(record){
					var res = {delta:{}};
					res['isRemoved'] = record['power'] === maxPower ? 1 : 0;
					res.delta['wealthy'] = record['power'] === minPower ? 0.5 : 0; 
					res.delta['power'] = record['power'] < medianPower && Math.random() > 0.6 ? 0.1 : 0;
					return res;
				});
			},
		]
	}
]