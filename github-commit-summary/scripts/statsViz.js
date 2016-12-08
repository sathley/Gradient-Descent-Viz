$(function() {
    $("body").height(window.innerHeight).width(window.innerWidth);

    settings = {
        repoName: "d3",
        weeksInSegments: 15,
        maxCollaborators: 10
    };

    var contributorChart = contributorStats(settings);

    $("#vizForm :input").each(function(i, d){
        input = $(d);
        input.val(settings[input.attr("name")]);
    });

    $('#update-settings').on('click', function() {
        $("#vizForm :input").each(function(i, d){
            input = $(d);
            settings[input.attr("name")] = input.val();
        });

        getProcessedData(settings).then(contributorChart.update);
    });
    getProcessedData(settings).then(contributorChart.update);
});

function contributorStats(settings) {
    var width = $("#vizContainer").width(),
        height = window.innerHeight,

    chart = d3.select("#contributor-chart");
    chart.attr("width", width).attr("height", height);

    var pie = d3.layout.pie()
        .sort(null)
        .padAngle(.01)
        .value(function(d) {
            return 1;
        });

    var arc = d3.svg.arc();

    this.update = function(data) {
        chartRadius = Math.min(width, height) / 2.5;
        chartInnerRadius = chartRadius/6;
        radiusDelta = chartRadius - chartInnerRadius;
        numberOfWeeks = settings.weeksInSegments;
        pieWidth = radiusDelta / numberOfWeeks;

        arc.innerRadius(function(d, i){
                return chartInnerRadius + (radiusDelta * i / numberOfWeeks);
            })
            .outerRadius(function(d, i) {
                return chartInnerRadius + (radiusDelta * i / numberOfWeeks) + pieWidth;
            });

        var donut = chart.selectAll('.repoCommits')
                    .data(function(){
                        pie(data).forEach(function(d){
                            d.data.weeks.forEach(function(week){
                                $.extend(week, d);
                            });
                        });
                        return data;
                    }, function(d){
                        return d.author.login;
                    });

        donut.enter().append("svg:g")
            .attr("class", "repoCommits")
            .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")");

        donut.exit().remove();

        // Start joining data with paths
        var paths = chart.selectAll('.repoCommits')
            .selectAll('.contributors')
            .data(function(d, i) {
                return d.weeks;
            }, function(d,i){
                return settings.repoName + "_" + d.data.author.login + "_" + i;
            });

        paths.enter()
            .append('svg:path')
            .attr("class", "contributors");

        paths
            .transition()
            .duration(500)
            .style('fill', "#000000")
            .style('fill-opacity', function(d, i){
                return (i+1)/numberOfWeeks;
            })
            .attr('d', arc);

        paths.exit()
        .transition()
            .duration(500).remove();
    }

    return this;
}

