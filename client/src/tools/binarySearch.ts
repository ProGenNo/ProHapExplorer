export function findLeftIndex(arr: Array<number>, x: number) {
    let start = 0
    let end  = arr.length - 1

    while (start <= end){
        const mid = Math.floor((start + end) / 2)
        if (arr[mid] === x) {
            return mid
        }

        else if (arr[mid] < x) {
            start = mid
        }

        else {
            end = mid
        }
    }

    return start
}