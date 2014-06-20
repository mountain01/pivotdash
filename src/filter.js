var app = angular.module("pivotdash.filters",[]);

app.filter("MonthCaps", function (){
	return function(month){
		var newMonth = angular.copy(month);
		newMonth = newMonth.toUpperCase();
		return newMonth.substr(0,3);
	}
});

app.filter("stripLastLetter", function() {
	return function(year){
		var newYear = angular.copy(year);
		return newYear.slice(0,newYear.length-1);
	}
});