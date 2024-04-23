function add_selected_aspects() {
    document.getElementById("add_selected_aspects").addEventListener('click', function () {
        const selectedCheckboxes = document.querySelectorAll('input[type=checkbox]:checked');
        const selectedValues = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);

        selectedValues.forEach((selectedValue, index) => {
            const selectedAspects = document.getElementsByClassName("selected_result");
            isAspectInList = 0 // 0:No  1:Yes
            if (selectedAspects.length > 0) {
                Array.from(selectedAspects).forEach(selectedAspect => {
                    if (selectedValue == selectedAspect.textContent) isAspectInList = 1;
                })
            }
            else console.log("No element selected"); 

            if (isAspectInList == 0) addSearchResults(selectedValue);
        })
    });
}

function addSearchResults(result) {
    const resultsContainer = document.getElementById("selected_results");
    const resultElement = document.createElement('div');
    const selected_aspect = document.createElement('span');
    selected_aspect.className = "selected_result";
    selected_aspect.textContent = result;
    resultElement.appendChild(selected_aspect);

    const removeButton = document.createElement("button");
    removeButton.className = "remove_button";
    removeButton.textContent = '削除';
    removeButton.onclick = function () {
        removeItem(resultElement);
    };

    resultElement.appendChild(removeButton);
    resultsContainer.appendChild(resultElement);
}

function removeItem(element) {
    const parent = element.parentNode;
    parent.removeChild(element);
}

document.getElementById("delete_button").addEventListener("click", function() {
    var selectedResults = document.getElementById("selected_results");
    while (selectedResults.firstChild) {
        selectedResults.removeChild(selectedResults.firstChild);
    }
});