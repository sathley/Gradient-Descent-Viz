$(function() {
    $("body").height(window.innerHeight).width(window.innerWidth);

    settings = {
        repoName: "tensorflow",
        maxCollaborators: 10,
        maxNumberOfSegments: 12,
        weeksInSegments: 4,
    };

    var contributorChart = contributorStats(settings);

    $("#vizForm :input").each(function(i, d){
        input = $(d);
        input.val(settings[input.attr("name")]);
    });

    $('#update-settings').on('click', function() {
        $("#vizForm :input").each(function(i, d){
            input = $(d);
            settings[input.attr("name")] = isNaN(input.val()) ? input.val() : parseInt(input.val());
        });

        getProcessedData(settings).then(contributorChart.update);
    });
    getProcessedData(settings).then(contributorChart.update);
});

function contributorStats(settings) {
    var repoName = settings.repoName;
    var width = $("#vizContainer").width(),
        height = window.innerHeight,

    chartRadius = Math.min(width, height) / 2.5;
    chartInnerRadius = chartRadius/6;
    radiusDelta = chartRadius - chartInnerRadius;

    chart = d3.select("#contributor-chart");
    chart.attr("width", width).attr("height", height);

    var opacity = d3.scale.linear().range([0.05,1]);

    var pie = d3.layout.pie()
        .sort(null)
        .padAngle(.01)
        .value(function(d) {
            return 1;
        });

    var contributorArcs = d3.svg.arc()
            .innerRadius(function(d, i){
                return chartRadius + 10;
            })
            .outerRadius(function(d, i) {
                return chartRadius + 20;
            });

    var arc = d3.svg.arc();
    var color = null;

    this.update = function(processedData) {
        if (repoName != settings.repoName || color == null) {
            color = d3.scale.category20();
            repoName = settings.repoName;
        }

        pieWidth = radiusDelta / settings.maxNumberOfSegments;

        opacity.domain([0, processedData.maxCommits]);

        arc.innerRadius(function(d, i){
                return chartInnerRadius + (radiusDelta * i / settings.maxNumberOfSegments);
            })
            .outerRadius(function(d, i) {
                return chartInnerRadius + (radiusDelta * i / settings.maxNumberOfSegments) + pieWidth;
            });

        var donut = chart.selectAll('.repoCommits')
                    .data(function(){
                        processedData.data = pie(processedData.data);
                        processedData.data.forEach(function(d){
                            d.data.weeks.forEach(function(week){
                                $.extend(week, d);
                            });
                        });
                        return processedData.data;
                    }, function(d){
                        return d.data.author.login;
                    });

        donut.enter().append("svg:g")
            .attr("class", "repoCommits")
            .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")")
                .append("svg:path")
                .attr("class", "contributor")
                .style('fill', function(d, i){
                    return color(d.data.author.login);
                })
                .attr('d', contributorArcs);

        donut.exit().remove();

        var paths = chart.selectAll('.repoCommits')
            .selectAll('.commits')
            .data(function(d, i) {
                return d.data.weeks;
            }, function(d,i){
                return settings.repoName + "_" + d.data.author.login + "_" + i;
            });

        paths.enter()
            .append('svg:path')
            .attr("class", "commits");

        paths
            .transition()
            .duration(500)
            .style('fill', "#000000")
            .style('fill-opacity', function(d, i){
                return opacity(d.totalCommits);
            })
            .attr('d', arc);

        paths.exit().remove();

        var legends = d3.select("#legends").selectAll(".legend")
            .data(processedData.data, function(d){
                return d.data.author.login;
            });

        legends.enter().append("div")
            .attr("class", "legend")
            .each(function(d, i){
                container = d3.select(this);
                container = container.append("a")
                    .attr("href", d.data.author.html_url)
                    .attr("target", "_blank");

                container.append("div")
                    .attr("class", "palette")
                    .style("background-color", color(d.data.author.login))
                    .text(" ");

                container.append("div")
                    .attr("class", "description")
                    .text(d.data.author.login);
            });

        legends.exit().remove();
    }

    return this;
}

