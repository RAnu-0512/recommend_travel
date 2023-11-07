#スポットの情報を読み込む
import csv


#県のスポットの情報を読み込む
def get_spotinfo():
    # spots_info = [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1]], ... ]
    spots_info = []
    latlng_info_path = "data\\latlng\\岡山_2.csv"
    #latlng_info_path=""

    with open(latlng_info_path, 'r', encoding='utf-8') as f_latlng:
        reader = csv.reader(f_latlng)
        for row in reader:
            sn = row[0]
            latlng=[]
            if(len(row) == 3):  # 最低3つの要素があることを確認
                latlng.append(float(row[1]))
                latlng.append(float(row[2]))
            spots_info.append([sn,latlng])

    aspect_folder_path = "data\\aspect_and_vector_list\\岡山\\"
    #aspect_path=""
    for spot_index in range(len(spots_info)):
        print(spots_info[spot_index][0])
        aspect_path = aspect_folder_path + spots_info[spot_index][0] + "_aspects_vecs.csv"
        with open(aspect_path,"r",encoding="utf-8") as f_aspect:
            reader = csv.reader(f_aspect)
            header = next(reader)
            rows = list(reader)
        spot_n_aspect = []
        asp_vec_str = []
        asp_vec_float = []
        cluster_vec_str = []
        cluster_vec_float = []

        for row in rows:
            spot_n_aspect.append(row[0])
            asp_vec_str.append(row[1])
            cluster_vec_str.append(row[2])
        for aspect_index in range(len(spot_n_aspect)) :
            asp_vec_float.append([float(value) for value in asp_vec_str[aspect_index].replace("[", "").replace("]", "").replace("\n", "").split()])
            cluster_vec_float.append([float(value) for value in cluster_vec_str[aspect_index].replace("[", "").replace("]", "").replace("\n", "").split()])
        
        spots_info[spot_index].append(spot_n_aspect)
        spots_info[spot_index].append(asp_vec_float)
        spots_info[spot_index].append(cluster_vec_float)

    return spots_info
