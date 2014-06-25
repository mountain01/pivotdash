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
				year.setFullYear(year.getFullYear() + 2);
				year.setDate(0);
				return year.getTime();
		}
	}

	function makeDummyProjects () {
		var projectNames = ["Pivot","Volunteer Manaager","Reading Tutors","Missionary Internet Use","TRC","TALL"];
		$scope.currentProjects = [];
		for (var i = 0; i < projectNames.length;i++){
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

	function rightOverflow (project,endInfo) {
		// body...
		var diff = 0;
		for (var quarter in $scope.yearRange){
			quarter = $scope.yearRange[quarter];
			var index = quarter.months.indexOf(endInfo[0]);
			if (index != -1){
				diff+=(index+1);
				break;
			}
			diff+=3;
		};
		return diff;
	}

	function leftOverflow (project,startInfo) {
		// body...
		var monthDiff = 0;
		for (var i = $scope.yearRange.length-1;i >= 0;i--){
			var index = $scope.yearRange[i].months.indexOf(startInfo[0]);
			if (index != -1){
				monthDiff+=(3-index);
				//0=3,1=2,2=1
				break;
			}
			monthDiff+=3;
		}
		return monthDiff;
	}

	$scope.getClass = function(project) {
		var startInfo = ($filter("date")(project.astartDate, "MMMM,yyyy")).split(",");
		var endInfo = ($filter("date")(project.cendDate, "MMMM,yyyy")).split(",");
		var offset = 0;
		var returnClass = "col-xs-";
		var monthDiff;
		var years = [];
		years.push($scope.yearRange[0].year);
		years.push($scope.yearRange[3].year);
		//normal width
		monthDiff = project.cendDate.getMonth() - project.astartDate.getMonth();
		if(project.cendDate.getFullYear() != project.astartDate.getFullYear()){
			monthDiff += 12;
		}
		//normal offset
		for (var i = 0;i < $scope.yearRange.length;i++){
			var index = $scope.yearRange[i].months.indexOf(startInfo[0]);
			if (index != -1){
				offset+=index;
				break;
			}
			offset+=3;
		}
		//change for overflow
		for (var quarter in $scope.yearRange){
			quarter = $scope.yearRange[quarter];
			if(!!~quarter.months.indexOf(endInfo[0]) && quarter.year != endInfo[1]){
				if(startInfo[1] <= Math.max(years[0],years[1])){
					monthDiff -= rightOverflow(project,endInfo);
					break;
				}
			}
			if(!!~quarter.months.indexOf(startInfo[0]) && quarter.year != startInfo[1]){
				if(endInfo[1] <= Math.min(years[0],years[1])){
					monthDiff -= leftOverflow(project,startInfo);
					offset = 0;
					break;
				}
			}
		}



		//set up classes for object
		if(monthDiff >=0){
			returnClass = returnClass.concat(monthDiff +1);
		}
		if(offset > 0){
			returnClass = returnClass.concat(" col-xs-offset-" + offset);
		}
		return returnClass;
	}

	$scope.isViewable = function(project){
		var startInfo = ($filter("date")(project.astartDate, "MMMM,yyyy")).split(",");
		var endInfo = ($filter("date")(project.cendDate, "MMMM,yyyy")).split(",");

		if((startInfo[1] <= $scope.yearRange[3].year.toString() && $scope.yearRange[3].year.toString() <= endInfo[1]) || 
			(startInfo[1] <= $scope.yearRange[0].year.toString() && $scope.yearRange[0].year.toString() <= endInfo[1])){
			for (var quarter in $scope.yearRange){
				quarter = $scope.yearRange[quarter];
				if(!!~quarter.months.indexOf(startInfo[0]) && quarter.year.toString() == startInfo[1]){
					return true
				}
				if(!!~quarter.months.indexOf(endInfo[0]) && quarter.year.toString() == endInfo[1]){
					return true
				}
			}
			
		}


		return false;
	};

}