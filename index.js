(async () => {
    const { missions, offbydefault } = await import("./missions.js");
    const { currentFileVersion, brickToName, brickToVersion, brickToImage, displayOrder } = await import("./friendlyNames.js");

    let configFileVersion = currentFileVersion;
    const selectedMissions = {};

    const radioParent = document.getElementById('radio-parent');
    radioParent.innerHTML = '';

    // Add any missing names to the friendly name list
    Object.keys(missions).forEach(mission => {
        if(!displayOrder.includes(mission)) {
            displayOrder.push(mission);
        }
    })

    let htmlToAdd = `<div class="accordion" id="mission-accordion">`;
    displayOrder.forEach((mission, missionIndex) => {
        let missionId = encodeForHtmlId(mission);

        if(!brickToName[mission]) console.warn(`Missing mission title: ${mission}`);

        let currentMissionHtmlToAdd = `<div id=${missionId} class="accordion-item">
                        <div class="accordion-header" id="heading${missionIndex}">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${missionIndex}" aria-expanded="true" aria-controls="collapse${missionIndex}">
                                ${brickToName[mission]}&nbsp;<span id="${missionId}-selected-counter">${missions[mission].filter(brick => !offbydefault.includes(brick)).length}</span>/${missions[mission].length}&nbsp;&nbsp;&nbsp;<span style="color: grey">${mission}</span><span id="${missionId}|new" class="badge rounded-pill bg-success new-hidden" style="margin-left: 5px">New</span>
                            </button>
                        </div>`;

        selectedMissions[mission] = {};

        missions[mission].forEach((brick, brickIndex) => {
            const isEnabled = !offbydefault.includes(brick);

            if(!brickToName[brick]) console.warn(`Missing brick title: ${brick}`);

            const isNewBrick = brickToVersion[brick] == currentFileVersion;
            
            if(isNewBrick)
            {
                currentMissionHtmlToAdd = currentMissionHtmlToAdd.replace('new-hidden', 'new-shown');
            }

            currentMissionHtmlToAdd +=
                `<div id="collapse${missionIndex}" class="accordion-collapse collapse" aria-labelledby="heading${missionIndex}" onmouseenter="showPreviewImage('${brick}')" onmousemove="movePreviewImage(event)" onmouseleave="hidePreviewImage()">
                    <div class="accordion-body">
                        <div class="form-check form-switch">
                            <input class="form-check-input variant-checkbox mission-${missionId}" type="checkbox" role="switch" id="${missionId}|${brick}" ${isEnabled ? 'checked' : ''} onchange="modifySelection('${missionId}', '${mission}', '${brick}')">
                            <label class="form-check-label" for="flexSwitchCheckChecked">${brickToName[brick]}${brickToName[brick] == 'Vanilla' ? '' : `<span style="color: grey">(${brick})</span>` } </label>
                            <span id="${missionId}|${brick}|new" class="badge rounded-pill bg-success" style="display:${(isNewBrick ? 'initial' : 'none')};">New</span>
                        </div>
                    </div>
                </div>`;

            selectedMissions[mission][brick] = isEnabled;
        });

        currentMissionHtmlToAdd += `</div>`;
        htmlToAdd += currentMissionHtmlToAdd;
    });
    htmlToAdd += `</div>`;

    radioParent.insertAdjacentHTML('beforeend', htmlToAdd);

    window.modifySelection = (missionId, mission, brick) => {
        selectedMissions[mission][brick] = document.getElementById(`${missionId}|${brick}`).checked;
        document.getElementById(`${missionId}-selected-counter`).innerText = Object.values(selectedMissions[mission]).filter(val => val).length;
    };

    window.generatePeacock = () => {
        var missionJson = {};
        Object.keys(selectedMissions).forEach(mission => {
            missionJson[mission] = [];
            Object.keys(selectedMissions[mission]).forEach(brick => {
                if(selectedMissions[mission][brick])
                {
                    missionJson[mission].push(brick);
                }
            });
        });

        downloadObjectAsJson(missionJson, 'FreelancerVariationMissions');
    };

    window.generateOnline = () => {
        var missionJson = {
            "patches": [],
            configFileVersion: currentFileVersion
        };

        Object.keys(selectedMissions).forEach(mission => {
            missionJson.patches.push({
                "scenePath": mission,
                "bricks": []
            });
            Object.keys(selectedMissions[mission]).forEach(brick => {
                if(selectedMissions[mission][brick])
                {
                    missionJson.patches[missionJson.patches.length - 1].bricks.push(brick);
                }
            });
        });

        downloadObjectAsJson(missionJson, 'RandomTOD');
    };
    
    window.loadExisting = (e) => {
        var fr = new FileReader();

        fr.onload = function(e) {
            var result = JSON.parse(e.target.result);

            var patches = result.patches;
            configFileVersion = result.configFileVersion;

            var onCount = 0;
            var offCount = 0;

            patches.forEach(mission => {
                let missionId = encodeForHtmlId(mission.scenePath);
                document.querySelectorAll(`.mission-${missionId}`).forEach(checkbox => {
                    var brick = checkbox.id.split('|')[1];
                    var isNew = brickToVersion[`${mission.scenePath}|${brick}`] > configFileVersion;

                    var includeBrick = mission.bricks.includes(brick) || isNew;

                    checkbox.checked = includeBrick;
                    includeBrick ? onCount++ : offCount++;

                    if(isNew)
                    {
                        document.getElementById(`${missionId}|new`).style.display = 'initial';
                    }
                    
                    document.getElementById(`${missionId}|${brick}|new`).style.display = isNew ? 'initial' : 'none';

                    window.modifySelection(missionId, mission.scenePath, brick);
                });
            })
            
            document.querySelector('#off-count').innerText = offCount;
            new bootstrap.Modal(document.getElementById('configLoadedModal')).show();
        }

        fr.readAsText(e.files.item(0));
    };

    window.showPreviewImage = (brick) => {
        document.getElementById('preview-image-popover').style.display = 'block';
        document.getElementById('preview-image').src = 
            './missionImages/' + 
            (brickToImage[brick] || brick.replace(/\.brick/g, '').split('/').at(-1)) +
            '.png'
    }

    window.movePreviewImage = (e) => {
        document.getElementById('preview-image-popover').style.left = Math.max(200, e.pageX) + 'px';
        document.getElementById('preview-image-popover').style.top = (e.pageY + 10) + 'px';
    }

    window.hidePreviewImage = () => {
        document.getElementById('preview-image-popover').style.display = 'none';
    }

    function downloadObjectAsJson(exportObj, exportName){
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function encodeForHtmlId(inputString) {
        // Replace spaces and special characters with underscores or other safe characters
        return inputString.replace(/[^a-zA-Z]/g, '');
    }
})();
