function range_bar() {
    let lastSelectedValue = distanceBar.value;
    distanceBar.addEventListener('input', function () {
        const selectedValue = distanceBar.value;
        selectedRange.textContent = selectedValue;
        lastSelectedValue = selectedValue;
    });
    return new Promise((resolve, reject) => {
        function clickHandler() {
            const distanceBar = document.getElementById('distance_bar');
            const distance_decide_button = document.getElementById('distance_decide_button');

            distance_decide_button.removeEventListener("click", clickHandler);
            distanceBar.disabled = true;
            distance_decide_button.disabled = true;

            // ページ上にその値を表示
            fetch('/distance_bar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: lastSelectedValue }),
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error("fetchに失敗しました");
                    }
                    return res.json();
                })
                .then(data => {
                    console.log(data);
                    recommend_mode = "select_spot"
                    fix_aspect_button.disabled = false;
                    fix_distance_button.disabled = false;
                    resolve();
                })
                .catch(error => {
                    console.error('Error:', error);
                    reject(error);
                });
        }
        document.getElementById("distance_decide_button").addEventListener('click', clickHandler);

    });
}

//初期値の表示
const distanceBar = document.getElementById('distance_bar');
const distance_decide_button = document.getElementById('distance_decide_button');
const selectedRange = document.getElementById('selected_range');
const selectedValue = distanceBar.value;
selectedRange.textContent = selectedValue;

function range_bar_always() {
    let lastSelectedValue = distanceBar.value;
    distanceBar.addEventListener('input', function () {
        const selectedValue = distanceBar.value;
        selectedRange.textContent = selectedValue;
        lastSelectedValue = selectedValue;
    });
}