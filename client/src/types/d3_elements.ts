export interface HistoData {
    label: string,
    value: number
}

export interface D3RectElem {
    x: number,
    y: number,
    width: number,
    height: number,
    color_hex: string,
    tooltiptext?: string,
    id?: string
}

export interface D3LineElem {
    x1: number,
    y1: number,
    x2: number,
    y2: number
    color_hex: string,
    id?: string,
    active?: boolean,
    tooltiptext?: string
}

export interface D3TextElem {
    x: number,
    y: number,
    t: string,
    highlight: boolean,
    fontsize?: number,
    id?: string,
    tooltiptext?: string,
    anchor?: string
}

export interface D3CircleElem {
    x: number,
    y: number,
    r: number,
    color_hex: string,
}