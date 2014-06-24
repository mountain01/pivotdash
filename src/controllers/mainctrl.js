function MainController($scope,$filter){

	$scope.today = new Date();
	$scope.showDatePicker = false;
	// var year = date.getFullYear();
	var quarter1 = ["January","February","March"];
	var quarter2 = ["April","May","June"];
	var quarter3 = ["July","August","September"];
	var quarter4 = ["October","November","December"];

	$scope.setupTop = function(month,year,gotoDate){
		var month = month || new Date().getMonth();
		var year = year || new Date().getFullYear();
		$scope.yearRange = [];
		var q1 = {"year":year,"months":quarter1};
		var q2 = {"year":year,"months":quarter2};
		var q3 = {"year":year,"months":quarter3};
		var q4 = {"year":year,"months":quarter4};
		$scope.yearRange.push(q1);
		$scope.yearRange.push(q2);
		$scope.yearRange.push(q3);
		$scope.yearRange.push(q4);
		if(month < 3){
			$scope.moveToPast();
		} else if (month <=8 && month > 5){
			$scope.moveToFuture();
		} else if (month > 8) {
			$scope.moveToFuture();
			$scope.moveToFuture();
		}
		if (angular.isUndefined(gotoDate)){
			$scope.selectedDate = "";
			$scope.dateToDisplay = "";
		}
	};

	$scope.moveToFuture = function(){
		var temp = $scope.yearRange[0];
		temp.year = temp.year+1;
		for (var i = 1; i < $scope.yearRange.length; i++){
			$scope.yearRange[i-1] = $scope.yearRange[i];
		}
		$scope.yearRange[$scope.yearRange.length -1] = temp;
		$scope.showDatePicker = false;
	};

	$scope.moveToPast = function(){
		var temp = $scope.yearRange[$scope.yearRange.length - 1];
		temp.year = temp.year-1;
		for (var i = $scope.yearRange.length - 1; i > 0; i--){
			$scope.yearRange[i] = $scope.yearRange[i-1];
		}
		$scope.yearRange[0] = temp;
		$scope.showDatePicker = false;
	};

	$scope.gotoDate = function(){
		var month = new Date($scope.selectedDate).getMonth();
		var year = new Date($scope.selectedDate).getFullYear();
		$scope.setupTop(month, year, true);
		$scope.moveToPast();
		$scope.dateToDisplay = new Date($scope.selectedDate);
		// $scope.showDatePicker = false;
	};

	$scope.setupTop();

	$scope.months=["January","February","March","April","May","June","July","August","September","October","November","December"];

	$scope.determineToday = function(month, year){
		if (year != new Date().getFullYear()){
			return false;
		}
		var thisMonth = $filter("date")($scope.today, "MMMM");
		if (month != thisMonth){
			return false
		}
		return true;
	};

	$scope.determineDate = function (month, year){
		var myDate = new Date($scope.selectedDate);
		var myYear = myDate.getFullYear();
		var myMonth = $filter("date")(myDate,"MMMM");

		if (year != myYear){
			return false;
		}
		if (month != myMonth){
			return false
		}
		return true;

	};

	function SetDate(type){
		var year = new Date();
		year.setMonth(0);
		switch (type){
			case 1:
				year.setDate(1);
				return year.getTime();
			case 2:
				year.setFullYear(year.getFullYear() + 1);
				year.setDate(0);
				return year.getTime();
		}
	}

	function makeDummyProjects () {
		var projectNames = ["Pivot","Volunteer Manaager","Reading Tutors","Missionary Internet Use","TRC","TALL"];
		$scope.currentProjects = [];
		for (var i = 0; i < 3; i++){
			var firstOfYear = SetDate(1);
			var endOfYear = SetDate(2);
			var randStart = Math.floor((Math.random() * (endOfYear - firstOfYear)) + firstOfYear);
			var randEnd = Math.floor((Math.random() * (endOfYear - randStart)) + randStart);
			var randIndex = Math.floor(Math.random() * projectNames.length);
			var project = {
				"bprojectName":projectNames[randIndex],
				"astartDate":new Date(randStart),
				"cendDate":new Date(randEnd)
			};
			projectNames.splice(randIndex,1);
			$scope.currentProjects.push(project);
		}
	}

	makeDummyProjects();

	$scope.getClass = function(project) {
		var month = $filter("date")(project.astartDate, "MMMM");
		var offset = 0;
		var breakout = false;
		var returnClass = "col-md-";
		var monthDiff = project.cendDate.getMonth() - project.astartDate.getMonth();
		returnClass = returnClass.concat(monthDiff +1);
		for (var i = 0;i < $scope.yearRange.length;i++){
			var index = $scope.yearRange[i].months.indexOf(month);
			if (index != -1){
				offset+=index;
				break;
			}
			offset+=3;
		}
		if(offset > 0){
			returnClass = returnClass.concat(" col-md-offset-" + offset);
		}
		return returnClass;
	}

}