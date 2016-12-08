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
    numberOfAuthors = settings.maxCollaborators || 8;
    numberOfWeeks = settings.weeksInSegments || 21;

    return getRepoInfo(settings.repoName).then(function(data){
        data = data.slice(Math.max(data.length - numberOfAuthors - 1, 0), data.length - 1);
        data.forEach(function(author){
            author.weeks = author.weeks.slice(Math.max(author.weeks.length - numberOfWeeks - 1, 0), author.weeks.length - 1);
        });
        return data;
    });
}


