from flask import Flask, render_template, jsonify, request, url_for,redirect
import webbrowser
import gensim
from read_sp_info import get_spotinfo
from return_aspect import return_aspect
from calculate_distance import calc_near_spot
from return_spot import return_spot
top_n = 10 #推薦スポット数
aspect_top_n = 10 #ヒットする観点数
# wor2vecモデル読み込み
#model_path = "D:\\Desktop\\研究B4\\小林_B4\\プログラムおよびデータ\\02.Google_Colab\\drive\\cc.ja.300.vec.gz"
#model_path = "C:\\Users\\kobayashi\\Desktop\\小林_B4\\プログラムおよびデータ\\02.Google Colab\\drive\\cc.ja.300.vec.gz"
model_path = "C:\\Users\\fkddn\\OneDrive\\デスクトップ\\cc.ja.300.vec.gz"

model = gensim.models.KeyedVectors.load_word2vec_format(model_path, binary=False)

#spots_info = [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1],[spots_aspectsVector_float_1],spot_numOfRev], ... ]
spots_info = get_spotinfo()
returned_aspect_list = []
returned_distance_range = 0

app = Flask(__name__)

@app.route("/", methods= ['GET'])
def return_html_test():
    print("test sucsess")
    return render_template("travel_recommend.html")

@app.route("/send_latlng", methods=['POST'])
def send_latlng():
    data = request.get_json()
    lat = float(data.get('cliked_lat'))
    lng = float(data.get('cliked_lng'))
    recommend_spots = return_spot(lat,lng,returned_distance_range,returned_aspect_list,spots_info,top_n) #形式 : [[spot_name,[lat,lng],aspects,score], ...]
    print("recommend_spots: ", recommend_spots)
    response_data = []
    #    response_data = {'spot_name': sp_info[0] , 'lat': sp_info[1][0], 'lng': sp_info[1][1], "distance": sp_info[-1] }
    for recommend_spot in recommend_spots:
        converted_data = {
            "spot_name" : recommend_spot[0],
            "lat" : recommend_spot[1][0],
            "lng" : recommend_spot[1][1],
            "aspects" : recommend_spot[2],
            "score" : recommend_spot[3]
        }
        response_data.append(converted_data)
        print("converted_data : ",converted_data)
    return jsonify(response_data)

@app.route("/search_form", methods=["POST"])
def get_search_keyword():
    print("get serach keyword")
    user_input=request.get_json()
    print(user_input)
    results = return_aspect(user_input.get("search_keyword"),spots_info,aspect_top_n,model)
    checkboxes = [{"label": result, "value": result} for result in results]
    return jsonify({"keyword": checkboxes})

@app.route("/process_selected_results", methods=["POST"])
def process_selected_results():
    global returned_aspect_list
    data = request.get_json()
    selected_results = data.get("selected_results")
    send_result = []
    for result in selected_results:
        send_result.append(result)
    response_data = {"message": send_result }
    returned_aspect_list = send_result
    print("選ばれた観点 : ", returned_aspect_list)
    return jsonify(response_data)

@app.route("/distance_bar",methods = ["POST"])
def get_range():
    global returned_distance_range
    returned_distance_range = int(request.get_json().get("value"))
    print("推薦範囲 : ",  returned_distance_range, "(km)")
    return str(returned_distance_range)

if __name__ == "__main__":
    webbrowser.open('http://localhost:8000')
    app.run(debug=True,host='localhost', port=8000, threaded=True, use_reloader=False)

