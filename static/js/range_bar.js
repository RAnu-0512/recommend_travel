function range_bar() {
    const distanceBar = document.getElementById('distance_bar');
    const selectedRange = document.getElementById('selected_range');
    let lastSelectedValue = distanceBar.value;
    distanceBar.addEventListener('input', function () {
        const selectedValue = distanceBar.value;
        selectedRange.textContent = selectedValue;
        lastSelectedValue = selectedValue;
    });

    // ページ上にその値を表示
    document.getElementById('send_selected_results').addEventListener('click', function () {
        distanceBar.disabled = true;
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
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
}
const distanceBar = document.getElementById('distance_bar');
const selectedRange = document.getElementById('selected_range');
const selectedValue = distanceBar.value;
selectedRange.textContent = selectedValue;
