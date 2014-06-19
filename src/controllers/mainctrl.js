function MainController($scope){

	var date = new Date();
	var year = date.getFullYear();
	var quarter1 = ["January","February","March"];
	var quarter2 = ["April","May","June"];
	var quarter3 = ["July","August","September"];
	var quarter4 = ["October","November","December"];

	$scope.setupTop = function(){
		var month = new Date().getMonth();
		var year = new Date().getFullYear();
		$scope.yearRange = [];
		var q1 = {"year":year,"months":quarter1};
		var q2 = {"year":year,"months":quarter2};
		var q3 = {"year":year,"months":quarter3};
		var q4 = {"year":year,"months":quarter4};
		$scope.yearRange.push(q1);
		$scope.yearRange.push(q2);
		$scope.yearRange.push(q3);
		$scope.yearRange.push(q4);
	};

	$scope.moveToFuture = function(){
		var temp = $scope.yearRange[0];
		if (!!~temp.months.indexOf("January") || !!~temp.months.indexOf("July")){
			temp.year = temp.year+1;
		}
		for (var i = 1; i < $scope.yearRange.length; i++){
			$scope.yearRange[i-1] = $scope.yearRange[i];
		}
		$scope.yearRange[$scope.yearRange.length -1] = temp;
	};

	$scope.moveToPast = function(){
		var temp = $scope.yearRange[$scope.yearRange.length - 1];
		if (!!~temp.months.indexOf("January") || !!~temp.months.indexOf("July")){
			temp.year = temp.year-1;
		}
		for (var i = $scope.yearRange.length - 1; i > 0; i--){
			$scope.yearRange[i] = $scope.yearRange[i-1];
		}
		$scope.yearRange[0] = temp;
	};

	$scope.setupTop();

	$scope.months=["January","February","March","April","May","June","July","August","September","October","November","December"];

}