from calculate_distance import haversine_distance 

#スコアが高いtop nスポットのスポットを返却
#spots_info = [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1]], ... ]
#形式は[[spot_name,[lat,lng],aspects,score], ...]
def return_spot(selected_lat, selected_lng, recommend_range, selected_aspect_list, spots_info,n):
    recommend_spots_info = []
    for spot_info in spots_info:
        sn = spot_info[0]
        lat = spot_info[1][0]
        lng = spot_info[1][1]
        aspect_list = spot_info[2]
        asp_vec_list = spot_info[3]
        cluster_vec_list = spot_info[4]
        if haversine_distance(selected_lat,selected_lng,lat,lng) <= recommend_range:
            score = calc_spot_score(selected_aspect_list, aspect_list, asp_vec_list)
            recommend_spots_info.append([sn,[lat,lng],aspect_list,score])
        sorted_recommend_spots_info = sorted(recommend_spots_info, key = lambda x:x[-1],reverse=True)
    if len(sorted_recommend_spots_info) <= n:
        print("return_spot : " ,sorted_recommend_spots_info)
        return sorted_recommend_spots_info
    else:
        print("return_spot : " ,sorted_recommend_spots_info[0:n])
        return sorted_recommend_spots_info[0:n]

def calc_spot_score(selected_aspect_list, aspect_list, asp_vec_list):
    score = 0
    for selected_aspect in selected_aspect_list:
        if selected_aspect in aspect_list:
            score = score + 1
    return score