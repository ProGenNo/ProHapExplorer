export function findLeftIndex(arr: Array<number>, element: number) {
    let lBound = 0
    let uBound  = arr.length - 1

    while ((uBound - lBound) > 1) {
        const midPoint = Math.floor((uBound - lBound) / 2) + lBound;
        
        if (arr[midPoint] < element) {
            lBound = midPoint
        }
        else if (arr[midPoint] === element) {
            return midPoint
        }
        else {
            uBound = midPoint
        }
    }

    /*if (element < arr[lBound]) return lBound
    else if (element > arr[uBound]) return uBound+1
    else */return lBound
}