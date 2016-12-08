function getRepoInfo(repoName) {
    return $.Deferred(function(){
        promise = this;
        data = JSON.parse(localStorage.getItem(repoName));
        if (data != null) {
            setTimeout(function(){
                promise.resolve(data);
            }, 0);
        } else {
            $.ajax({
                type: "GET",
                contentType: "application/json; charset=utf-8",
                dataType: 'json',
                url: ("https://api.github.com/search/repositories?q=" + repoName),
                async: true,
                cache: true,
            }).then(function(data, status, error){    //status = ["success", "notmodified", "nocontent", "error", "timeout", "abort", "parsererror"]
                if (status == "success") {
                    exactRepoFound = data.items[0].name == repoName
                    repoStats = {
                        name: data.items[0].name,
                        owner: data.items[0].owner.login
                    }

                    $.ajax({
                        type: "GET",
                        contentType: "application/json; charset=utf-8",
                        dataType: 'json',
                        url: ("https://api.github.com/repos/" + repoStats.owner + "/" + (repoStats.name) + "/stats/contributors"),
                        async: true,
                        cache: true,
                    }).then(function(data, status, error){
                        if (status == "success") {
                            localStorage.setItem(repoName, JSON.stringify(data));
                            promise.resolve(data);
                        }
                    })
                }
            });
        }
    });
}

function getProcessedData(settings) {
    maxWeeks = settings.maxNumberOfSegments * settings.weeksInSegments;
    lastWeek = 0;
    weeksSize = null;
    maxCommits = 0;
    return getRepoInfo(settings.repoName).then(function(data){
        data = data.slice(Math.max(data.length - settings.maxCollaborators - 1, 0), data.length - 1);
        data.forEach(function(author){
            if (weeksSize == null) {
                weeksSize = author.weeks.length;
                maxWeeks = Math.min(maxWeeks, weeksSize);
                lastWeek = weeksSize - maxWeeks;
            }

            var week = [];
            for(var i = weeksSize - 1; i >= (lastWeek + settings.weeksInSegments - 1); i -= settings.weeksInSegments) {
                var aggregate = {additions: 0, deletion: 0, totalCommits: 0, week: 0};
                for(var j = 0; j < settings.weeksInSegments; j++) {
                    index = i - j;
                    aggregate.additions += author.weeks[index].a;
                    aggregate.deletion += author.weeks[index].d;
                    aggregate.totalCommits += author.weeks[index].c;
                    if (j == settings.weeksInSegments - 1) {
                        aggregate.week = author.weeks[index].w * 1000;
                    }
                }
                week.unshift(aggregate);
                maxCommits = Math.max(maxCommits, aggregate.totalCommits);
            }
            author.weeks = week;
        });
        return {
            maxCommits: maxCommits,
            data: data
        };
    });
}


