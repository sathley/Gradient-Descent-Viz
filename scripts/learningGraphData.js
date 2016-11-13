//stub
function stub(x, y){
    return x*x + y*y;
}

//Stub
function getErrorDataSet(){
    var out = [];
    var i,j;
    var min, max;
    var error;

    for(i=-10; i<10; i++){
      for(j=-10; j<10; j++){
        error = stub(i,j);
        error = error/20.0;
        max = Math.max(max || error, error);
        min = Math.min(min || error, error);
        out.push([i, j, error]);
      }
    }

    out.xDomain = [-10, 10];
    out.xStepSize = 1;
    out.yDomain = [-10, 10];
    out.yStepSize = 1;
    out.zColorDomain = [[0.6, 1.0, 0.3, 1.0], [1.0, 0.0, 0.3, 1.0]];
    out.zRange = [min, max];
    return out;
}

function createVertices() {
    var dataSet = getErrorDataSet();
    var vertices = [];
    var color = [];

    var xSize = (dataSet.xDomain[1] - dataSet.xDomain[0])/dataSet.xStepSize,
        ySize = (dataSet.yDomain[1] - dataSet.yDomain[0])/dataSet.yStepSize,
        zSize = dataSet.zRange[1] - dataSet.zRange[0],
        zStepSize = 1 / zSize,
        colorRange = [
            (dataSet.zColorDomain[1][0] - dataSet.zColorDomain[0][0]),
            (dataSet.zColorDomain[1][1] - dataSet.zColorDomain[0][1]),
            (dataSet.zColorDomain[1][2] - dataSet.zColorDomain[0][2]),
            (dataSet.zColorDomain[1][3] - dataSet.zColorDomain[0][3])
        ];

    var i, j, index, colorSteps;

    for(i = 0; i < xSize; i++){
        vertices = vertices.concat(dataSet[i * xSize]);
        color = color.concat([0.0, 0.0, 0.0, 0.0]);
        for(j = 0; j < ySize; j++){
            index = i * xSize + j;
            singularSteps = (dataSet[index][2] - dataSet.zRange[0]) * zStepSize;
            vertices = vertices.concat(dataSet[index]);
            color = color.concat([
                dataSet.zColorDomain[0][0] + colorRange[0] * singularSteps,
                dataSet.zColorDomain[0][1] + colorRange[1] * singularSteps,
                dataSet.zColorDomain[0][2] + colorRange[2] * singularSteps,
                dataSet.zColorDomain[0][3] + colorRange[3] * singularSteps
            ]);
        }
        vertices = vertices.concat(dataSet[i * xSize + ySize - 1]);
        color = color.concat([0.0, 0.0, 0.0, 0.0]);
    }
    return {
        vertices: vertices,
        colors: color
    };
}