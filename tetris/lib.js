/*
MasterMentor (c) 2024
STEAMCLUB LICENCE
https://steamclub.net
*/

if(window._22 === undefined) _22 = {};
if(_22._ == undefined) _22._ = _;

//------------------------------------------
// SOFTWARE/HARDWARE ABSTRACTION LEVEL
//------------------------------------------
var runtime_HAL =
{
	isNuf		: function(x) { return (x === false) || (x === null) || (typeof x === 'undefined'); },

	//------------------------------------------
	// FILES API
	//------------------------------------------
	// @list		= { id_1 : { url : '', type: 'xxxxx', }, ... }
	// @options		= { type: 'xxxxx' }
	// type = file_image | file_text  | file_font | file_binary
	load_files		: async function(list)
	{
		for(var k=0,len=list.length; k<len; ++k) { await this.load_file(list[k]); }
	},
	//------------------------------------------

	file_struct		:
	{
		// IN
		type		: null,
		path		: null,
		id			: null, // FOR FONTS
		// OUT
		resource	: null,		// IMAGE OBJECT | TEXT FILE | FONT OBJECT
		is_ok		: true,		// true | false
	},

	load_file		: async function(file_struct)
	{
		var o=this,_o=file_struct;
		try
		{
			_o.is_ok = true;
			switch(_o.type)
			{
				case 'file_text':
					var response = await fetch(_o.path);
					_o.resource = await response.text();
				break;

				case 'file_binary':
					var response = await fetch(_o.path);
					_o.resource = await response.arrayBuffer();
				break;

				case 'file_image':
					_o.resource = new Image();
					_o.resource.src=_o.path;
					await _o.resource.decode(); // The decode() method of the HTMLImageElement interface returns a Promise that resolves once the image is decoded and it is safe to append it to the DOM.
				break;

				case 'file_font':
					_o.resource = new FontFace(_o.id, 'url('+_o.path+')');
					await _o.resource.load();
					document.fonts.add(_o.resource);
				break;

				case 'file_sound':
					_o.resource = new Audio();
					_o.resource.muted = true; // muted='muted'
					// _o.resource.volume = 0.2;
					_o.resource.src=_o.path;
				break;

				default:
					throw ('ERR: API USAGE ERROR UNKNOWN SWITCH');
				break;
			}
		}
		catch (e)
		{
			console.log('ERR: LOAD FILE ERROR: ' + _o.path);
			_o.is_ok = false;
			_o.resource = null;
		}
		return _o.is_ok;
	},
	//------------------------------------------

	struct_graphics_options :
	{
		opacity			: null,		// RANGE: 0.0-1.0 | false
		scale_type		: null,		// 0 - default, 1 - pixelated, 2 - smoothing
		stroke_width	: null,
		stroke_color	: null,
		fill_color		: null,
		font			: null,
	},
	graphics_options		: function(is_set, ctx, _o = null)
	{
		var o=this,lib = ctx.draw_api, _r=null;

		if(!is_set) _r =
		{
			opacity		: lib.globalAlpha,
			scale_type	: lib.imageSmoothingEnabled ? 2:1,
		};

		if(is_set && _o)
		{
			if(!o.isNuf(_o.stroke_width))			lib.lineWidth		= _o.stroke_width;
			if(!o.isNuf(_o.stroke_color))			lib.strokeStyle		= _o.stroke_color;
			if(!o.isNuf(_o.fill_color))				lib.fillStyle		= _o.fill_color;
			if(typeof _o.opacity == 'number')		lib.globalAlpha		= _o.opacity;
			if(typeof _o.scale_type == 'number')	lib.imageSmoothingEnabled	= (_o.scale_type == 1)?false:true;
			if(!o.isNuf(_o.font))					lib.font			= _o.font;
		}
		return _r;
	},

	struct_surface_2d :
	{
		draw_api		: null,
		container		: null,
		crect			: [0,0,0,0],	 // [0,0,width,height]
	},
	init_surface_2d		: function(is_init, struct_surface_2d, crect = [0,0,0,0])
	{
		var o=this,_o=struct_surface_2d;

		if(is_init)
		{
			if (typeof(_o.container) == "string")
			{
				_o.container = document.getElementById(_o.container);
				_o.container.width = crect[2]; _o.container.height = crect[3];
			}
			else
			{
				_o.container = document.createElement('canvas');
				_o.crect = [...crect];
				_o.container.width = crect[2]; _o.container.height = crect[3];
			}

			_o.draw_api = _o.container.getContext('2d');
			o.init_surface_graphics(_o);
		}
		else
		{
			_o.draw_api = null;
			_o.container = null;
		}
	},

	init_surface_graphics			: async function(struct_surface_2d)
	{
			var lib = struct_surface_2d.draw_api;

			// DON'T TOUCH THIS

			//------------------------------------------
			// RESET TEXT SUBSYSTEM
			//------------------------------------------
			lib.textBaseline	= 'top';
			lib.textAlign		= 'start';
			lib.direction		= 'ltr';
			lib.fontKerning		= 'normal';
			lib.wordSpacing		= '0px';
			lib.letterSpacing	= '0px';
			lib.lineCap		 	= 'butt';
			lib.lineJoin		= 'miter';
			lib.textRendering	= 'auto';	// auto optimizeSpeed optimizeLegibility geometricPrecision
			//------------------------------------------

			//------------------------------------------
			// DrawImage problem adjacent sprite
			//------------------------------------------
			/*
			Thus, scaling an image in parts or in whole will have the same effect. This does mean that when sprites coming from a single sprite sheet are to be scaled, adjacent images in the sprite sheet can interfere. This can be avoided by ensuring each sprite in the sheet is surrounded by a border of transparent black, or by copying sprites to be scaled into temporary canvas elements and drawing the scaled sprites from there.
			Disable anti-aliasing altogether. The compromise here is that the "smooth" look you get with anti-aliasing will change the perceived art style of your game.
			This can be achieved in modern browsers with added CSS & JavaScript.
			This is an unavoidable artifact of anti-aliasing.
			https://gamedev.stackexchange.com/questions/152383/drawimage-problem-adjacent-sprite
			https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look
			SEE CODE
			https://stackoverflow.com/questions/3900436/image-scaling-by-css-is-there-a-webkit-alternative-for-moz-crisp-edges/8888964?noredirect=1#comment29827016_8888964
			http://phrogz.net/tmp/canvas_image_zoom.html

					.disable-anti-aliasing {
					image-rendering: optimizeSpeed;
					image-rendering: -moz-crisp-edges;
					image-rendering: -webkit-optimize-contrast;
					image-rendering: -o-crisp-edges;
					image-rendering: optimize-contrast;
					image-rendering: pixelated;
					-ms-interpolation-mode: nearest-neighbor;
					}

			*/
			//------------------------------------------

			lib.imageSmoothingEnabled			= false;
	},
	//------------------------------------------

	createClass		: function(class_text)
	{
		/*
		USE
		createClass('.cssClass { color: #f00; }');
		document.getElementById('someElementId').className = 'cssClass';
		*/

		var style			= document.createElement('style');
		style.type			= 'text/css';
		style.innerHTML		= class_text;
		document.getElementsByTagName('head')[0].appendChild(style);
	},

};
//------------------------------------------

//------------------------------------------
// LIBRARY
//------------------------------------------
var LIB =
{

	markers_str2num		: function(src, constants)
	{
		var o=this,_=_22._;
		return _.reduce(src, function(acc, v,k,l) {
							return acc |= constants[v]; }, 0);
	},

	//------------------------------------------
	// REGEX RELATED
	//------------------------------------------
	regex_ranges: function(s, regex)
	{
		var match = null, infinity_detector = null, ranges = [];

		regex.lastIndex = 0; // RESET REGEX
		while(match = regex.exec(s))
		{
			var range = [match.index, regex.lastIndex];

			// 1. DETECT INIFINITY LOOP. SEE https://stackoverflow.com/questions/23775267/javascript-regex-match-going-in-infinite-loop
			// CASE: THE SAME EMPTY STRING TWICE FOUND. POSSIBLE INFINITY LOOP
			if((infinity_detector === range[0]) && (range[0] === range[1])) break;
			infinity_detector = range[0];

			// 2. PUSH RANGE
			ranges.push(range);
			if(!regex.global) break; // BREAK IF REGEX WITHOUT g FLAG
		}
		//------------------------------------------

		return ranges;
	},

	//------------------------------------------
	// TEXT STORAGE PROCESSING
	//------------------------------------------
	TextBlockStorageClass:
	{
		//------------------------------------------
		// TEXT BLOCK MARKERS
		st :
		{
			'=Empty'			: 0 << 0,
			'=Text'				: 1 << 1,	// DEFAULT
			'=Json'				: 1 << 2,	// Json
			'=JavaScript'		: 1 << 3,	// JavaScript
			// '=HJson'			: 1 << 4,	// Human Json
		},
		//------------------------------------------

		assigned_text			: '',
		text_blocks				: {},

		//------------------------------------------
		// ENGINE ONE POINT TEXT PIECES STORAGE SERVING
		//------------------------------------------
		// USED FOR CREATE ONE POINT TEXT PIECES STORAGE
		template_items : function(body_) {
			return new_clone(this).assign_text(body_).get_block_all(); },
		//------------------------------------------

		get_block_all : function()
		{
			var o=this,_=_22._; var k = _.keys(o.text_blocks);
			return _.object(k,_.map(k, function(v,k,l) { return o.get_block(v); }));
		},

		get_block : function(uid, def_ret_val = null)
		{
			var o=this,_=_22._;

			if(!_.has(o.text_blocks, uid)) return def_ret_val;

			var _r = '', sd = o.text_blocks[uid];
			for(var i = 0; i < LEN(sd); i+=2)
			{
				var tmp = o.assigned_text.substring(sd[i+0].span[1], sd[i+1].span[0]);
				switch(true)
				{
					case !!(sd[i+0].state & o.st['=Json']):  _r = JSON.parse(tmp); break;
					case !!(sd[i+0].state & o.st['=JavaScript']): _r = (new Function('return ('+tmp+');'))(); break;
					default: _r += tmp; break;
				}
			}

			return _r;
		},

		assign_text : function(text)
		{
			var o=this,_=_22._;

			var spans = LIB.regex_ranges(text, /<!--(\s|\S)*?-->/g);
			spans = _.map(spans, function(v,k,l)
			{
				var spans_descr =
				{
					uid:			null,
					markers:		[],
					span:			v,
					state:			0,
				};

				// split by one or more whitespace characters regex - \s+
				var chunks = text.substring(v[0]+LEN('<!--'), v[1]-LEN('-->')).split(/\s+/).filter(function(i){return i;});
				_.some(chunks, function(v,k,l)
				{
					if(v[0] == '=')
					{
						spans_descr.markers.push(v);
						if(_.has(o.st, v)) spans_descr.state |= o.st[v];
					}
					else
					{
						if(spans_descr.uid) { spans_descr.uid = null; return true; }; // BREAK LOOP ID FOUND TWICE
						spans_descr.uid = v;
					}
				});

				return spans_descr;
			});

			spans = _.filter(spans, function(v,k,l) { return v.uid != null; });
			o.text_blocks = _.omit(_.groupBy(spans, 'uid'), function(v,k,l) { return LEN(v) % 2; }); // REMOVE ELEMENTS % 2 (BEGIN, END)
			o.assigned_text = text;

			return o;
		},
	},
	//------------------------------------------
};
