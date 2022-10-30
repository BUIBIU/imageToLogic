import { Msch } from './msch/index.js'
import {Block,LogicBlock} from './msch/blocks/index.js'
var app = null
window.onload = function () {
    app = new Vue({
        el: "#app",
        data: {
            filegetter: null,
            showimage: null,
            ctx: null,
            image: null,
            screenname: "display1",
            size: 176,
            compress: 2,
            codedata: [],
            colorMap: null,
            textarea: null,
            haveimage: false,
        },
        components: {},
        methods: {
            changeImage() {
                this.colorMap = new Map();
                this.codedata = [];
                //this.codedata.splice(0,this.codedata.length);
                //console.log(this.codedata);
                this.ctx.canvas.width = this.size;
                this.ctx.canvas.height = this.size;
                //console.log(this.image.height);
                // 获取原图宽高
                var height = this.image.height;
                var width = this.image.width;
                // 设置canvas大小与原图宽高一致
                // this.ctx.canvas.height = height;
                // this.ctx.canvas.width = width;
                // 在canvas绘制图片
                if (height > width) {
                    let k = height / this.size;
                    height = this.size;
                    width = width / k;
                }
                if (width > height) {
                    let k = width / this.size;
                    width = this.size;
                    height = height / k;
                }
                if (width == height) {
                    width = this.size;
                    height = this.size;
                }
                this.ctx.drawImage(this.image, 0, 0, width, height);

                var cutImage = this.ctx.getImageData(0, 0, this.size, this.size);
                this.compressPic(cutImage);
                this.ctx.putImageData(cutImage, 0, 0, 0, 0, this.size, this.size);
                this.getColorMap(cutImage);

                console.log(this.codedata);

                const msch = new Msch()
                const chipCount = this.codedata.length
                const chipHeight = Math.ceil(chipCount/6)
                msch.width = 6
                msch.height = 6+chipHeight
                msch.tags = {
                    name:'pic-out',
                    description:''
                }
                const screen = new Block('large-logic-display',{x:2,y:2},3,null)

                msch.blocks.push(screen)
                this.codedata.forEach(({code},index)=>{
                    const x = index%6
                    const y = Math.floor(index/6)+6
                    const block =  new LogicBlock('micro-processor',{x,y},3,null)
                    block.code = code
                    block.links.push({
                        name:this.screenname,
                        x: 2 - x,
                        y: 2 - y
                    })
                    msch.blocks.push(block)
                })
                const out = msch.write()
                const base64 = btoa(
                    out.reduce((data, byte) => data + String.fromCharCode(byte), '')
                )
                this.textarea.value = base64;
                this.textarea.select();
                document.execCommand("copy");
            },
            copy(code) {
                this.$set(code,'copyed',true)
                this.textarea.value = code.code;
                this.textarea.select();
                document.execCommand("copy");
            },
            getpixel(image, x, y) {
                let index = (image.width * y + x) * 4;
                let r = image.data[index];
                index++;
                let g = image.data[index];
                index++;
                let b = image.data[index];
                index++;
                let a = image.data[index];
                return {
                    r: r,
                    g: g,
                    b: b,
                    a: a
                };
            },
            setpixel(image, x, y, data) {
                let index = (image.width * y + x) * 4;
                image.data[index] = data.r;
                index++;
                image.data[index] = data.g;
                index++;
                image.data[index] = data.b;
                index++;
                image.data[index] = data.a;
                // return { r: r, g: g, b: b, a: a };
            },
            zip(n, b) {
                let k = Math.pow(2, b);
                return (Math.round(n / k)) * k;

                // n = n >>> b;
                // n = n << b;
                // return n;
            },

            compressPic(image) {
                for (let y = 0; y < image.height; y++) {
                    for (let x = 0; x < image.width; x++) {
                        let data = this.getpixel(image, x, y);
                        if (data.a == 0) {
                            break;
                        }
                        data.r = this.zip(data.r, this.compress);
                        data.g = this.zip(data.g, this.compress);
                        data.b = this.zip(data.b, this.compress);

                        this.setpixel(image, x, y, data);
                    }
                }
            },
            isSameColor(color1, color2) {
                return (
                    color1.r == color2.r &&
                    color1.g == color2.g &&
                    color1.b == color2.b &&
                    color1.a == color2.a
                );
            },
            getMaxBox(image, x, y) {
                let color = this.getpixel(image, x, y);
                if (color.a == 0) {
                    return null;
                }
                let maxX = -1;
                let maxY = 0;
                let maxSize = {
                    area: 0,
                    x: 0,
                    y: 0
                };
                while (true) {
                    let mx = 0;
                    let c = this.getpixel(image, x, y + maxY);
                    if (!this.isSameColor(color, c)) {
                        break;
                    }
                    mx++;
                    while (true) {
                        if (x + mx >= this.size) {
                            break;
                        }
                        let color2 = this.getpixel(image, x + mx, y + maxY);
                        if (this.isSameColor(color, color2)) {
                            mx++;
                        } else {
                            break;
                        }
                    }
                    maxY++;
                    if (maxX == -1 || mx < maxX) {
                        maxX = mx;
                    }
                    let area = maxY * maxX;
                    if (area > maxSize.area) {
                        maxSize.area = area;
                        maxSize.x = maxX;
                        maxSize.y = maxY;
                    }
                }
                maxX = maxSize.x;
                maxY = maxSize.y;
                for (let sy = 0; sy < maxY; sy++) {
                    for (let sx = 0; sx < maxX; sx++) {
                        this.setpixel(image, x + sx, y + sy, {
                            r: 0,
                            g: 0,
                            b: 0,
                            a: 0
                        });
                    }
                }
                return {
                    color: color,
                    box: {
                        x: x,
                        y: y,
                        sx: maxX,
                        sy: maxY
                    }
                };
            },

            getColorMap(image) {
                for (let y = 0; y < image.height; y++) {
                    for (let x = 0; x < image.width; x++) {
                        let data = this.getMaxBox(image, x, y);

                        if (data == null) {
                            continue;
                        }

                        //data.a = zip(data.a,compress)
                        let s =
                            data.color.r +
                            "," +
                            data.color.g +
                            "," +
                            data.color.b +
                            "," +
                            data.color.a;
                        if (this.colorMap.get(s) == null) {
                            this.colorMap.set(s, {
                                color: null,
                                boxs: []
                            });
                        }
                        let obj = this.colorMap.get(s);
                        let box = data.box;
                        obj.color = data.color;
                        obj.boxs.push(box);
                    }
                }
                //console.log(this.colorMap);
                this.getCode2();
            },
            newCode() {
                let code = {
                    count: 0,
                    string: ""
                };
                //code.string += "draw clear 0 0 0 0 0 0\n";
                return code;
            },
            getCode2() {
                this.codedata.splice(0, this.codedata.length);
                let code = this.newCode();
                let i = 0;
                this.colorMap.forEach((obj) => {
                    let color = obj.color;
                    let c =
                        "draw color " +
                        color.r +
                        " " +
                        color.g +
                        " " +
                        color.b +
                        " " +
                        color.a +
                        " 0 0\n";
                    code.string += c;
                    code.count++;

                    obj.boxs.forEach((box) => {
                        if (code.count == 0) {
                            let color = obj.color;
                            let c =
                                "draw color " +
                                color.r +
                                " " +
                                color.g +
                                " " +
                                color.b +
                                " " +
                                color.a +
                                " 0 0\n";
                            code.string += c;
                            code.count++;
                            i = 0;
                        }
                        code.string +=
                            "draw rect " +
                            box.x +
                            " " +
                            (this.size - box.y - box.sy) +
                            // box.y +
                            " " +
                            box.sx +
                            " " +
                            box.sy +
                            " 0 0\n";
                        code.count++;
                        i++;

                        if (i % 20 == 0) {
                            code.string += "drawflush " + this.screenname + "\n";
                            let color = obj.color;
                            let c =
                                "draw color " +
                                color.r +
                                " " +
                                color.g +
                                " " +
                                color.b +
                                " " +
                                color.a +
                                " 0 0\n";
                            code.string += c;
                            code.count += 2;
                        }

                        if (code.count >= 990) {
                            code.string += "drawflush " + this.screenname + "\n";
                            this.codedata.push({code:code.string,copyed:false});

                            code = this.newCode();
                        }
                    });
                });
                code.string += "drawflush " + this.screenname + "\n";
                this.codedata.push({code:code.string,copyed:false});
            },
        },
        mounted() {
            var colorMap = new Map();

            this.textarea = document.getElementById("textarea");

            this.showimage = document.getElementById("showimage");
            this.ctx = this.showimage.getContext("2d");

            this.filegetter = document.getElementById("filegetter");
            this.filegetter.addEventListener("change", (e) => {
                var reader = new FileReader();
                reader.readAsDataURL(e.target.files[0]);
                reader.onloadend = (e) => {
                    this.image = new Image();
                    this.image.src = e.target.result;
                    this.image.onload = () => {
                        this.haveimage = true;
                    };
                };
            });
        },
    })
    console.log(app);
}