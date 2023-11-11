# spots_info = [[spot_name_1, [lat_1,lng_1], [aspects_1],[asp_vectors_1],[cluster_vectors_1]], ... ]
def return_aspect(query,spots_info):
    result = []
    for spot in spots_info:
        spotname =spot[0]
        spot_latlng = spot[1]
        aspects = spot[2]
#       print(f"spotname : {spotname}")
#       print(f"latlng : {spot_latlng}")
#       print(f"aspects : {aspects}")  
        if query in aspects:
            result.append(f"{query} is in {spot[0]}")
            result.append(query)
#            print(f"{query} is in {spot[0]}")
        

    result.extend(["自然","景色","子ども","子供"])
    return result