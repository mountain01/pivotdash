function MainController($scope){

	var date = new Date();
	var year = date.getFullYear();
	$scope.yearRange = [];
	for (var i = year - 3; i < year + 4;i++){
		$scope.yearRange.push(i);
	};

	$scope.months=["January","February","March","April","May","June","July","August","September","October","November","December"];

}