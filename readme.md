#Layout
前端MVC框架，基于JQuery（Dom操作和ajax），内置对象/类：基础工具对象Utils，事件管理器Events，数据模型Model，视图管理器View，控制器Controller，历史记录管理器histroy，路由管理器Router。利用extend函数可对其进行自定义扩展
***
###1.Utils 工具对象 
####内部属性：<br>
	unquid()：获一个唯一的标识符
	fnName()：获取函数名
	isWindow(obj)：判断是否为window对象
	isFunction(fn)：判断是否为函数
	isObject(obj)：判断是否为对象
	isPlainObject(obj)：判断是否为纯粹的对象（通过对象直接量{}或者new Object()得到的）
	isRegExp(reg)：判断是否为正则
	isArray(arr)：判断是否为数组
	removeByKey(o,key)：根据键移除数组或对象元素
	removeByValue(o,val)：根据值移除数组或对象元素
	escape(str)：escape编码
	unescape(str)：解码
	extend([bool],ret,obj):将obj复制到ret,bool决定是否深复制，不填默认为false
####可自定义扩展Utils上的属性（禁止直接覆盖该对象）：
	如：
	Layout.Utils.strTurnDate = function(str){ //将字符串转换成日期格式
        var re = /^(\d{4})\S(\d{1,2})\S(\d{1,2})$/;
        var dt;
        if(re.test(str)){
           dt = new Date(RegExp.$1,RegExp.$2-1,RegExp.$3);
        }
        return dt;
    }

###2.Events 事件管理器
####内部属性：
	handlers:一个数组，on绑定的对象回调函数管理器。
	oncehandlers:一个数组，once绑定的对象回调函数管理器。
	on（type,callback）：给对象绑定事件（原生或者自定义）和回调函数。优先级高于once
	once（type,callback):给对象绑定一次性事件和回调函数
	off(type,[callback1，callback2...])：移除事件的回调函数，没有指定是移除该事件的全部回调函数
	trigger（type）：触犯某事件

####内部事件:
	change：model上的事件，当发生改变时触发
####自定义事件:
	var obj = new Object();
	var updateFn = function(){
		console.log('obj has changed');
	}
	obj.on('update',updateFn);//绑定
	obj.trigger('update');//触发
	obj.off('update');//移除
	
###3.sync 同步函数
	//基于jQuery的ajax方法
	//重写
	Layout.sync = function(type,url,data,success,error){
		//type为数据传输的方式，get/post/put等
	
	}
	

###4.Model 数据模型
 
模型，三层，最上一层为Model的原型，中间层为对Model扩展得到的类(构造函数)的原型，底层为模型实例<br>
每个扩展的类有独立的对象管理器instances，管理通过自身实例化的对象<br>
每个实例化的对象都有独属于自己的事件的回调函数管理器，管理自身定义的事件;还有视图管理器views，管理自身绑定的视图<br>
	1.底层：初始化函数init执行，事件管理器的回调函数管理器handlers，视图管理器views等<br>
	2.中间层：扩展的属性，Model对象管理器instances等<br>
	3. 顶层：Model原型方法以及事件管理器中定义的方法等<br>	
####示例：
	var Video = Layout.Model.extend({
		url:'http://localhost:8000/test/video.php', //获取和保存数据的接口
		default:{  //所有实例对象的默认值
			name:'iii'
		},
		parse:function(res){  //数据处理函数，后台数据返回时会调用此函数进行处理
			var json = JSON.parse(res);
			for (var i = 0; i < json.length; i++) {
				json[i].title = 'aaa'
			}
			this.on('parse',function(){

			})
			return json;
		},
		init:function(){  //初始化函数
			this.name = 'yujon';
		    this.on('init',function(){
				console.log('obj init in itself');
			})		
		},
		localize:true,  //是否本地存储

	})

	var video = new Video;  //此对象不会添加到对象管理器，要添加可通过video.add()

	
	//1.此时video对象本身属性有in_id,name,newInstance，data,handlers,oncehandlers,in_id，views视图管理器（扩展view时指定了model则会被本模型对象管理)等
	//2.video的__proto__即Video构造函数的原型Video的属性有mid,default,url,localize,init,parse，/instances(对象管理器，存储每个对象的in_id)等
	//3.video__proto__的__proto__即Video的原型的原型属性有once,on,off,trigger,init,parse,add,local等等，其中一部分(例如init,parse会被覆盖）
	//此外，Video构造函数有find,fetch和save方法，find查找对象实例，fetch与save可以为当前Video的原型的对象管理器中的所有对象获取数据或者保存数据

	Video.fetch(function(res,data){  //获取数据
		console.log(data)
    })
	Video.save(); //保存数据
	
	//fetch()获得多条数据时会为每一条数据记录创建一个video对象并且添加到对象管理器中
	

####实例属性：
	in_id:对象的唯一标识
	newInstance:标识当前对象是否为新对象，保存时只保存本值为true的对象
	mid:构造函数的唯一标识，用于本地存储key
	instances:对象管理器
	handlers:事件回调函数管理器
	data:对象的数据对象
	default：所有实例对象的默认数据对象
	oncehandlers：一次性事件回调函数处理器
	add()：将当前新添加一份到对象管理器
	update():将当前对象保存到对象管理
	remove():从对象管理器中移除当前对象
	get(key)：获取对象属性
	set(key,val)：设置对象属性，会调用validate函数以及触发render函数
	validate(val):对set的值进行验证，可重写，返回布尔值
	render():渲染视图管理器中的所有视图
	toJSON()：返回当前对象的数据属性
	default:对象，所有实例对象的默认数据对象
	localize: boolean,是否本地化,默认为false
	init():初始化函数
	parse(res):对后台返回的数据进行处理
	stringify（）：对要发送的数据进行处理
	local：本地存储操作类
		local.set(key,val):存储键值对
		local.get(key):获取键值
		remove(key):移除键值对
		clear():清除本地存储
####类属性：
	find([in_id]):查找所有实例或者某个实例
	fetch(success,error):传递俩个回调函数success(model,data),error(model,data)；model为构造函数的原型对象，data为返回的数据，从（本地或者）后台获取数据
	save()：保存当前模型管理器中所有新对象的数据对象到后台（以及本地）
####事件：
	change:当实例的数据对象更改时触发
	add:当对象的拷贝手动添加到instances触发
	update：当把修改过的对象的拷贝添加到对象管理器时触发
	remove:当移除对象时触发


###5.view 视图
####示例：
	var View = Layout.View.extend({
		wrapper:'#wrapper', //模板的容器以及当前视图的管理范围
		tpl:'#tpl',  //模板,支持id,class,tag选择
		model:video,  //若定义了本属性，本视图对象将会与video数据模型绑定实现数据同步
		events:{  //该模板绑定事件
			'click #add':'add'
		},
		init:function(){  //初始化函数
			this.render(); //该方法会调用template方法（获取tpl模板）得到模板渲染后添加到wrapper
		},
		add:function(){
			console.log('add')
		},

	})

####内部属性：
	wrapper:模板容器和视图管理范围
	tpl:模板
	model:若定义了本属性，视图模板将会与video数据模型绑定实现数据同步
	template（[tpl,settings]）:不传tpl则获取tpl属性定义的模板返回一个函数，该函数接受数据对象进行渲染,settings可定义解析模板的正则
	render（data）：不传data则调用model的toJSON()获得数据进行渲染
	events：模板的事件响应
	init:初始化函数

###6.Controller 控制器
定义代码逻辑以及和对页面的控制
####内部属性
	el:定义控制器的作用范围
	events:定义页面的事件响应规则（在el内有效)
	init:初始化函数
	
###7.history 历史记录管理器
监听hash变化、控制页面的跳转
####内部属性：
	routeHandlers:回调函数管理器
	router(route,callback):存储回调规则到routeHandlers
	refresh():获取当前hash并根据路由规则跳转
	navigate（hash）:根据hash跳转到某个视图
	start():跳转到url!#,并且监听hash变化根据规则跳转。app开始务必执行该函数

	
###Router 路由管理器
定义路由规则，解析并将其存储到history的routeHandlers以便于跳转
####内部属性：
	routes：定义路由规则
	routeToRegExp(route):定义路由解析规则，可重写自定义规则
	init:初始化函数
####示例：
	
	var Router = Layout.Router.extend({
		routes:{
			'/':'index',
			"/user/:id":'userFn',
			'/new/*id':'newFn'
		},
		userFn:function(){
			console.log('user')
		},
		index:function(){
			console.log('index')
		}
	})
	var router = new Router();
	Layout.history.start();



