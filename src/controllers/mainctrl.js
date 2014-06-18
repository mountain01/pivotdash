function MainController($scope){

	var date = new Date();
	var year = date.getFullYear();
	$scope.yearRange = {};
	for (var i = year - 1; i < year + 2;i++){
		$scope.yearRange[i] = [];
		$scope.yearRange[i].push(i+"a");
		$scope.yearRange[i].push(i+"b");
	};

	$scope.months=["January","February","March","April","May","June","July","August","September","October","November","December"];

}