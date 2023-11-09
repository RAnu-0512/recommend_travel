from flask import Flask, render_template, jsonify, request, url_for,redirect
import webbrowser
#import gensim
from read_sp_info import get_spotinfo
from return_aspect import return_aspect
from calculate_distance import calc_near_spot

# wor2vecモデル読み込み
model_path = "D:\\Desktop\\研究B4\\小林_B4\\プログラムおよびデータ\\02.Google_Colab\\drive\\cc.ja.300.vec.gz"
#model_path = "C:\\Users\\kobayashi\\Desktop\\word2vec\\cc.ja.300.vec.gz"
#model = gensim.models.KeyedVectors.load_word2vec_format(model_path, binary=False)

#spots_info = [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1]], ... ]
spots_info = get_spotinfo()

app = Flask(__name__)

@app.route("/", methods= ['GET'])
def return_html_test():
    print("test sucsess")
    return render_template("travel_recommend.html")

@app.route("/send_latlng", methods=['POST'])
def send_latlng():
    print("send latlng")
    data = request.get_json()
    lat = float(data.get('cliked_lat'))
    lng = float(data.get('cliked_lng'))

    sp_info = calc_near_spot(lat,lng,1,spots_info)

    #JavaScriptに返す  
    response_data = {'spot_name': sp_info[0] , 'lat': sp_info[1][0], 'lng': sp_info[1][1], "distance": sp_info[-1] }
    return jsonify(response_data)

@app.route("/search_form", methods=["POST"])
def get_search_keyword():
    print("get serach keyword")
    user_input=request.get_json()
    print(user_input)
    results = return_aspect(user_input.get("search_keyword"),spots_info)
    checkboxes = [{"label": result, "value": result} for result in results]
    return jsonify({"keyword": checkboxes})

@app.route("/process_selected_results", methods=["POST"])
def process_selected_results():
    data = request.get_json()
    selected_results = data.get("selected_results")
    
    # 選択された結果に対する何らかの処理を行う
    # 例: 選択された結果をログに記録
    send_result = []
    for result in selected_results:
        print(f"選択された結果: {result}")
        send_result.append(result)

    # 処理結果をJavaScriptに返す
    response_data = {"message": send_result }
    return jsonify(response_data)
@app.route("/distance_bar",methods = ["POST"])
def get_range():
    range = int(request.get_data())
    return range

if __name__ == "__main__":
    webbrowser.open('http://localhost:8000')
    app.run(debug=True,host='localhost', port=8000, threaded=True, use_reloader=False)

