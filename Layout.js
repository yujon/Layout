;(function(window,undefined){
	var Layout = {};

	Layout.$ = (window.jQuery || window.zepto ||window.$) ? (window.jQuery || window.zepto ||window.$):null;
	
	//工具函数
	var Utils = Layout.Utils = {

		unquid:function() {
			var d = new Date().getTime();
			var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			  var r = (d + Math.random()*16)%16 | 0;
			  d = Math.floor(d/16);
			  return (c=='x' ? r : (r&0x3|0x8)).toString(16);
			});
			return uuid;
		},
		fnName : function(){  
		    var tmp = arguments.callee.toString();  
		    var re = /function\s*(\w*)/i;  
		    var matches = re.exec(tmp);  
		    return matches[1];
		}, 
		isWindow:function(obj){
			return obj && typeof obj === "object" && "setInterval" in obj;
		},
		isFunction : function(fn){
			return typeof fn === 'function';
		},
		isRegExp : function(reg){
			return /^\/.*\/[igm]{0,3}$/.test(reg);
		},
		isObject : function(obj){
			return typeof obj === 'object';
		},
		isPlainObject:function(obj){
			if ( !obj || typeof obj !== 'object' || obj.nodeType || this.isWindow(obj)) {
				return false;
			}
			if ( obj.constructor && !hasOwnProperty.call(obj, "constructor") && !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
			var key;
			for ( key in obj ) {}
			// key === undefined及不存在任何属性，认为是简单的纯对象
			// hasOwnProperty.call( obj, key ) 属性key不为空，且属性key的对象自身的（即不是通过prototype继承的）
			return key === undefined || hasOwnProperty.call( obj, key );

		},
		isArray:function isArray(arr){
		    return arr && typeof arr==='object' && Array == arr.constructor;
		},
		removeByKey:function(o,key){ //通过key移除对象或者数组的元素
			if(this.isArray(o)){
					var  index = o.indexOf(o[key]);
					if(index !== -1) o.splice(index,1);
			}else if(this.isObject(o)){
				for(var i in o){
					if(i == key){
						delete o[i];
					}
				}
			}
			return o;
		},
		removeByValue:function (o, val) { //通过val移除对象或者数组的元素
			if(this.isArray(o)){
				for(var i=0; i<o.length; i++) {
					if(o[i] == val) {
						o.splice(i, 1);
						break;
					}
				}
			}else if(this.isObject(o)){
				for(var key in o){
					if(o[key] == val){
						delete o[key];
					}
				}
			}
			return o;
		},
		escape:function(str){
			return window.escape.call(this,str);
		},
		unescape:function(str){
			return window.unescape.call(this,str);
		},
		extend:function(){  //拷贝
			var bool,ret,obj;
			if(typeof arguments[0] === 'boolean'){
				bool = arguments[0];
				ret = arguments[1];
				obj = arguments[2];
			}else{
				bool = false;
				ret = arguments[0];
				obj = arguments[1];
			}
			var type = obj.construct ===  Array?[]:{};
			if(typeof type !== 'object'){
				return;
			}else{
				for (var i in obj) {
					if(bool){
						ret[i] = typeof obj[i] === 'object'?this.extend(true,{},obj[i]):obj[i];
					}else{
						ret[i] = obj[i];
					}
					
				}
			}
			return ret;
		}
	};

	//自定义事件管理器
	var Events = Layout.Events = {
		on : function(type,handler){
			if(!this.handlers){
				Object.defineProperty(this,'handlers',{
					value :{},
					configurable : true,
					enumerable : false,
					wirtable :true
				})
			}
			if(!this.handlers[type]){
				this.handlers[type] = [];
			}
			this.handlers[type].push(handler);
		},
		once:function(type,hander){
			if(!this.oncehandlers){
				Object.defineProperty(this,'oncehandlers',{
					value :{},
					configurable : true,
					enumerable : false,
					wirtable :true
				})
			}
			if(!this.oncehandlers[type]){
				this.oncehandlers[type] = [];
			}
			this.oncehandlers[type].push(handler);
		},
		off : function(type){
			var handlers = this.handlers[type] || this.oncehandlers[type];
			if(Utils.isArray(handlers)){
				if(arguments.length >1){
					for(var i =1;i<arguments.length;i++){
						Utils.removeByValue(handlers,arguments[i])
					}
				}else{
					Utils.removeByKey(this.handlers,type);
				}
			}
		},
		trigger : function(type){
			var handlers;
			if(Utils.isArray(this.handlers[type])){
				handlers = this.handlers[type];
				for (var i = 0; i <handlers.length; i++) {
					handlers[i]();
				}
			}else if(Utils.isArray(this.oncehandlers[type])){
				handlers = this.oncehandlers[type];
				for (var i = 0; i <handlers.length; i++) {
					handlers[i]();
				}
				Utils.removeByKey(this.oncehandlers,type);
			}
		}
	};

	//同步函数
	Layout.sync = function(type,url,data,success,error){
		Layout.$.ajax({
			url:url,
			type:type,
			data:data,
			success:success,
			error:error
		})
	}

	// 模型，三层，最上一层为Model的原型，中间层为对Model扩展得到的类(构造函数)的原型，底层为模型实例
	// 每个扩展的类有独立的对象管理器instances，管理通过自身实例化的对象
	// 每个实例化的对象都有独属于自己的事件的回调函数管理器，管理自身定义的事件;还有视图管理器views，管理自身绑定的视图
	// 底层：初始化函数init执行，事件管理器的回调函数管理器handlers，视图管理器views等
	// 中间层：扩展的属性，Model对象管理器instances等
	// 顶层：Model原型方法以及事件管理器中定义的方法等
	var Model = Layout.Model = function(options,record){
		var obj = Object.create(Model.prototype); 
		obj.instances = {}; //模型对象(记录)管理器
		obj.mid = Utils.unquid();
		obj.localize = false;
		obj.default = {};
		obj.url = "";
		Utils.isPlainObject(options) && Utils.extend(true,obj,options);
		var create = function(record){ 			
			if(record){
				this.in_id = Utils.unquid();
				this.newInstance = false;
				this.data= record;
				this.instances[this.in_id] = this;
			}else{
				this.data = this.default? Utils.extend(true,{},this.default):{};
			}
			this.init && this.init.call(this);
		};
		create.fetch = function(success,error){
			var fn = create.prototype;
			fn.instances = {}; //获取第二层的instances
			var url = fn.url ? fn.url:null;
			var req = fn.req ? fn.req:null;
			var obj;
			var doSuccess = function(res){
				var data = fn.parse (res);
				for (var i in data) {
					new create(data[i]);
				}
				//本地存储
				if(fn.mid && fn.localize && window.localStorage){
					fn.local.set(fn.mid,JSON.stringify(data));
				}
				success?success(fn,data):null;
			};
			var doError = function(res){
				error?error(fn,res):null;
			};
			//本地获取
			if(fn.mid && window.localStorage){
				var str = fn.local.get(fn.mid);
				if(str){
					var data = JSON.parse(str);
					for (var i in data) {
						new create(data[i]);
					};
					success?success(fn,data):null;
					return;
				}
			};
			//服务器端获取
			Layout.sync('get',url,req,doSuccess,doError);
		},
		create.save =function(){ //根据newInstance判断记录是否需要同步存储
			var fn = create.prototype;
			var url = fn.url ? fn.url:null;
			var instances = fn.instances;
			var data = {};
			for (var i in instances) {
				if(instances[i].newInstance){
					data[i] = instances[i].data;
				}			
			}
			//本地存储
			if(fn.mid && fn.localize && window.localStorage){
				fn.local.set(fn.mid,JSON.stringify(data));
			}
			//同步到数据库
			Layout.sync('post',url,fn.stringify(data));
		}
		//供create的对象调用
		create.find = function(in_id){
			var fn = create.prototype;
			var instance;
			if(in_id){
				instance = fn.instances[in_id];
				if(!instance){
			        // return throw "Unknown model";
				}
				return instance;
			}else{
				return fn.instances;
			}
			
			
		},
		create.prototype = obj;
		return create; //返回一个构造函数
	};
	Model.prototype = Model.fn = {
		construct : Model,
		init:function(){}, //初始化函数
		parse:function(res){
			return JSON.parse(res);
		}, //对取回的数据进行处理
		stringify:function(data){
			return JSON.stringify(data);
		}, //对要发送的数据进行处理
		validate:function(val){
			return true;
		},
		add :function(){ //当前将模型对象新添加到管理器instances
			this.in_id = Utils.unquid();
			this.newInstance = true;
			this.instances[this.in_id] = Utils.extend(true,{},this);
			this.handlers && this.handlers['add'] && this.trigger('add');
		},
		update: function(){ //更新模型实例
			this.newInstance = true;
			this.instances[this.in_id] = Utils.extend(true,{},this);
			this.handlers && this.handlers['update'] && this.trigger('update');
			this.render();
		},
		remove:function(){ 
			delete this.instances[this.in_id];
			this.handlers && this.handlers['remove'] && this.trigger('remove');
			this.render();
		},
		get:function(key){
			return this.data[key];
		},
		set:function(key,val){
			if(this.validate(val)){  //验证函数
				this.data[key] = val;
				this.handlers && this.handlers['change'] && this.trigger('change');
				this.render();
			}			
		},
		toJSON:function(){
			return this.data;
		},
		//模型的工具方法		
		local : {
			get:function(mid){
				return localStorage.getItem(mid);
			},
			set:function(mid,data){
				localStorage.setItem(mid,data);
			},
			remove:function(mid){
				localStorage.removeItem(mid);
			},
			clear:function(){
				localStorage.clear();
			}
		},
		render:function(){   //渲染当前模型绑定的视图
			if(this.views){
				for (var i = 0; i < this.views.length; i++) {
					this.views[i].render();
				}
			}
		}
	}

	//视图。三层
	//wrapper表示模板的管理范围，以及默认为将要存放模板的容器（可以重写render方法避免）
	//tpl表示模板
	//model表示将要绑定的模板，定义了之后将会与该模板对象保持数据同步
	//自定义事件events只作用在wrapper范围内，格式为:
	/**
	 * events:{
	*  	'#btn click':'btnClick'
	*  	'#btn hover':function(){ alert('btn hover')}
	* }
	 * 
	 */
	var View = Layout.View = function(options){
		var obj = Object.create(View.prototype);
		Utils.isPlainObject(options) && Utils.extend(true,obj,options);
		var create = function(){ 
			var wrapper = this.wrapper ? this.wrapper :'body'; 
			var events = this.events;
			if(wrapper){   //当前控制器的作用范围
				this.$wrapper = Layout.$(wrapper);
			}
			var type,arr,callback;
			if(events){  //定义的事件响应
				for(var i in events){
					arr = i.split(' ');
					type = arr[0];
					el = arr[1];
					 if(Utils.isFunction(events[i])){
					 	callback = events[i];
					 }else if(Utils.isFunction(this[events[i]])){
					 	callback = this[events[i]];
					 }
					this.$wrapper.find(el).on(type,callback);
				}
			}
			this.model && this.addView(this.model);//如果定义了绑定的模型
			if(options.init){
				this.init.call(this);
			}
		};
		create.prototype = obj;
		return create; //返回一个构造函数
	}
	View.prototype = View.fn = {
		construct:View,
		addView:function(model){
			if(!model.views) model.views = [];
			model.views.push(this);
		},
		templateSettings :{
			expression    : /<%([\s\S]+?)%>/g,  
    		plainVar : /<%=([\s\S]+?)%>/g,  
    		escapeVar      : /<%-([\s\S]+?)%>/g  
		},
		noMatch:/(.)^/,
		template:function(text,settings){ //以传递的text构建模板，否则则以定义的tpl构建模板
			var render;
			var tpl = this.tpl || 'body';
			text = $(text).html() || $(tpl).html();
			settings = settings || this.templateSettings || {};
			noMatch = this.noMatch;
			var matcher = new RegExp([
				(settings.escapeVar || noMatch).source,
				(settings.plainVar || noMatch).source,
				(settings.expression || noMatch).source
			].join("|")+'|$','g');  ///<%-([\s\S]+?)%>|<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g  
			var escapes = {  
			    "'": "'",  
			    '\\': '\\',  
			    '\r': 'r',  
			    '\n': 'n',  
			    '\u2028':'u2028',  
			    '\u2029':'u2029'  
			}; 
			var escaper =/\\|'|\r|\n|\u2028|\u2029/g;
			var escapeChar =function(match){
				return '\\' + escapes[match];
			};
			var index = 0;
			var source = "__p+='";
			text.replace(matcher,function(match,escapeVar,plainVar,expression,offset){
				source += (text.slice(index,offset).replace(escaper,escapeChar));
				index = match.length + offset;
				if(escapeVar)  source += "'+\n((__t=("+escapeVar+"))==null?'':Layout.Utils.escape(__t))+\n'"; // 需要转码的字符串部分的处理  
				if(plainVar)   source += "'+\n((__t=("+plainVar+"))==null?'':__t)+\n'";
				if(expression) source += "';\n"+expression+"\n__p+='";
				return match;
			})
			source += "';\n"; 
			source = 'with(obj){\n' + source + '}\n'; //obj为之后的render的第一个参数
			source = "var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+source +"return __p;\n";  
		    try{
		    	// console.log(source)
		    	render = new Function('obj',source);
		    }catch(e){
		    	e.source = source;
		    	throw e;
		    }
		    var template = function(data){
		    	return render.call(this,data);
		    }
		    template.source = "function(obj){\n"+source+"\n}";
		    return template;
		},
		render:function(data){ //渲染传递的数据，否则则渲染绑定的模型的数据
			data = data || (this.model && this.model.toJSON()) || {};
			this.$wrapper.html((this.template())(data));
		}
	}

		//控制器,三层
	//el，控制器控制范围
	//events事件管理器，在el范围内
	var Controller = Layout.Controller = function(options){
		var obj = Object.create(Controller.fn);
		Utils.isPlainObject(options) && Utils.extend(true,obj,options);
		var create = function(){ 
			var el = this.el ? this.el :'body'; 
			var events = this.events;
			if(el){   //当前控制器的作用范围
				this.$el = Layout.$(el);
			}
			var type,arr,callback;
			if(events){  //定义的事件响应
				for(var i in events){
					arr = i.split(' ');
					type = arr[0];
					el = arr[1];
					 if(Utils.isFunction(events[i])){
					 	callback = events[i];
					 }else if(Utils.isFunction(this[events[i]])){
					 	callback = this[events[i]];
					 }
					this.$el.find(el).on(type,callback);
				}
			}
			if(options.init){
				options.init.call(this);
			}
		};
		create.prototype = obj;
		return create; //返回一个构造函数
	};
	Controller.prototype = Controller.fn = {
		construct:Controller
	}

	//根据handlers定义的规则,实际执行路由跳转.
	var History = Layout.History = function(){}
	History.prototype = History.fn = {
		construct : History,
		routeHandlers:[], //存储路由规则和相应的回调函数
		router:function(route,callback){  //添加路由规则和回调函数
			this.routeHandlers.unshift({route:route,callback:callback});
		},
		start : function(router){ //start初始化浏览器的hash并且监听hash变化事件
    		// if(window.onpopstate){
    		// 	window.addEventListener('onpopstate',this.refresh.bind(this),false);
    		// }else{
    		//  window.addEventListener('hashchange', this.refresh.bind(this), false);
    		// }
    		window.addEventListener('hashchange', this.refresh.bind(this), false);
    		this.navigate('#!/');
		},
		navigate:function(hash){ //url跳转
			// if(history.pushState){ 
			// 	history.pushState({},'',hash);
			// 	return;
			// }
			location.hash = hash;
		},
		refresh:function(){ 
			var currentHash = location.hash.slice(2) || '/';
			var routeHandlers = this.routeHandlers || [];
			for (var i = 0; i < handlers.length; i++) {
				if(routeHandlers[i]['route'].test(currentHash)){
					routeHandlers[i]['callback'].call(this);
				}
			}
		}

	}
	Layout.history = new History();

	//路由器，定义路由规则，解析并将其存储到history的handlers以便于跳转
	var Router = Layout.Router = function(options){
		var obj = Object.create(Router.prototype);
		Utils.isPlainObject(options) && Utils.extend(true,obj,options);
		var create = function(){ 
			var callback=null,routes = this.routes;
			if(routes){
				for(var route in routes){  //将定义的路由规则转化为正则规则并且存储到history的handlers
					fn = routes[route];
					if(Utils.isFunction(routes[route])){
					 	callback = routes[route];
					}else if(Utils.isFunction(this[routes[route]])){
					 	callback = this[routes[route]];
					}
					if (!Utils.isRegExp(route)) route = this.routeToRegExp(route);				
					Layout.history.router(route,callback);
				}
			}
			this.init && this.init.call(this);
		};
		create.prototype = obj;
		return create; //返回一个构造函数
	}
	Router.prototype = Router.fn = {
		construct:Router,
		routeToRegExp:function(route){
			var optionalParam = /\((.*?)\)/g;
			var namedParam    = /(\(\?)?:\w+/g;
			var splatParam    = /\*\w+/g;
			var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;
			route = route.replace(escapeRegExp, '\\$&')//  /[\-{}\[\]+?.,\\\^$|#\s]/g,给所有匹配的字符前面加转义符'\'
                .replace(optionalParam, '(?:$1)?')// /\((.*?)\)/g
                .replace(namedParam, function(match, optional) {
                    return optional ? match : '([^\/]+)';  //  /(\(\?)?:\w+/g
                })
                .replace(splatParam, '(.*?)');
            return new RegExp('^' + route + '$');
		},
		navigate:function(hash){
			history.navigate(hash);
		}
		
	}

	//扩展函数
	var extend = function(options){
		var extended = options.extended;  //回调函数
		delete options.extended;
		if( !Utils.isPlainObject(options)){
			return;
		}
		for (var i in options) {
			if( i === 'url' || i === 'localize' || i==='wrapper' || i==='tpl' || Utils.isObject(options[i]) || Layout.Utils.isFunction(options[i])){
				continue;
			}
			delete options[i];
		}
		var self = this.call({},options);
		if(extended){
			extended(self);
		}
		return self;
	}

	Layout.Model.extend =  Layout.Router.extend = Layout.Controller.extend =Layout.View.extend = extend;

	//给模型添加事件管理器
	Utils.extend(true,Model.fn,Events);
	Utils.extend(true,Controller.fn,Events);
	Utils.extend(true,Router.fn,Events);
	Utils.extend(true,View.fn,Events);

	window.Layout = Layout;
})(window)