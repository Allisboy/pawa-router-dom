import {$state,runEffect,setContext,useContext,useInsert,useValidateProps
  ,useRef, useInnerContext, useComponent} from 'pawajs';

const matchRoute = (pattern, path) => {
  // Remove trailing slashes for consistency
  const cleanPattern = pattern.replace(/\/$/, '');
  const cleanPath = path.replace(/\/$/, '');
  
  const patternParts = cleanPattern.split('/');
  const pathParts = cleanPath.split('/');
  
  if (patternParts.length !== pathParts.length) {
    
    return [false, {}];
  }
  
  const params = {};
  
  const match = patternParts.every((part, index) => {
    if (part.startsWith(':')) {
      // This is a parameter
      const paramName = part.slice(1);
      params[paramName] = pathParts[index];
      return true;
    }
    return part === pathParts[index];
  });
  
  return [match, params];
}
const routeContext=setContext()
const Router = ({children}) => {
const  {setValue}=routeContext
  const routes=$state([])
  const current=$state('')
  const group=$state('')
  const prefix=$state('')
  const for404=$state(false)
  const isRoute=$state({})
  const routeParams=useRef()
  const routeMap=new Map()
  const checkRoute=(route)=>{
    return routeMap.has(route)
  }
  const setRoute=(route,groups='',prefixs='')=>{
    
    if(routeMap.has(route)){
      return
    }else{
      routes.value.push({route:route,group:groups,prefix:prefixs})
      routeMap.set(route,{route:route,group:groups,prefix:prefixs})
    }
  }
  
  setValue({
    routes,current,group,for404,setRoute,
    routeParams,isRoute,prefix,checkRoute,
  })
  function enhanceHistoryAPI() {
    if (window.__pawaHistoryEnhanced) return;
    window.__pawaHistoryEnhanced = true;
  
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
  
    const event = new Event('pushchange');
    const dispatchPushEvent = () => {
      window.dispatchEvent(event);
    };
  
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      dispatchPushEvent();
    };
  
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      dispatchPushEvent();
    };
    window.addEventListener('popstate', (e)=>{
      e.preventDefault?.();
      dispatchPushEvent()
    })
  }
  enhanceHistoryAPI()
  runEffect(()=>{
    isRoute.value={
      current:window.location.pathname,
      route:''
    }
    const pop=(e) => {
      e.preventDefault()
        isRoute.value.current = window.location.pathname
      // console.log(isRoute,current.value);
    }
    window.addEventListener('pushchange', pop);
    return () => {
      // window.removeEventListener('popstate',pop)
      // window.removeEventListener('pushchange',pop)
    }
  },0)
  runEffect(() => {
    return ()=>{
      // console.log(isRoute);
    
     const findRoute= routes.value.filter((route) => {
       const [match,param]=matchRoute(route.route,isRoute.value.current)          
          if (param) {
            routeParams.value=param
          }
          return match
      })
      if (findRoute.length === 0) {
        group.value=''
        prefix.value=''
        current.value=''
        for404.value=true
      } else{
        for404.value=false
        const newRoute=findRoute[0]
        group.value=newRoute.group
        isRoute.value.route=newRoute.route
        prefix.value=newRoute.prefix
      }
      if (findRoute.length > 1) {
        console.warn('duplicate routes '+ isRoute.value)
        __pawaDev.setError({el:'ROUTER',msg:`Duplicate Routes ${isRoute.value}` })
      }
    }
      
      //  console.log(current.value,routes.value);
      
  },{component:true})
  useInsert({isRoute})
    return `
    <template>
    ${children}
    </template>
    `
}



const RouteGroup=({children}) => {
  const {name} = useValidateProps({
    name:{
      type:String,
      strict:true
    }
  })
  const {group}=useContext(routeContext)
  const grouping=$state({
    name:name,
    enter:false
  })  
  runEffect(() => {    
     grouping.value.enter=true
  })
  useInsert({group,name,grouping})
  return`
  <template if='group.value === name || !grouping.value.enter'>
    ${children}
  </template>
  `
}
const RoutePrefix=({children}) => {
  const {name} = useValidateProps({
    name:{
      type:String,
      strict:true
    }
  })
  const {prefix}=useContext(routeContext)
  const prefixing=$state({
    name:name,
    enter:false
  })
  
    runEffect(() => {
    // console.log('prefix',prefixing.value,name);
    
      prefixing.value.enter=true
  })
  useInsert({prefix,name,prefixing})
  return`
  <template if='prefix.value === name || !prefixing.value.enter' >
    ${children}
  </template>
  `
}


const Route=({children}) => {
    const {route,guard,notfound} = useValidateProps({
      route:{
        type:String,
        default:'/'
      },
      guard:{
        default:1,
      },
      notfound:{
        default:false
      }
    })
    const {setRoute,current,for404,isRoute,checkRoute,isMatchedRoute}=useContext(routeContext)
    const context=useInnerContext()
    const contextRoute=useContext(routeContext)
    const group=context?.grouping?.value?.name ? context.grouping.value.name:''
    const prefix=context?.prefixing?.value?.name ?context.prefixing.value.name:''
    const thisRoute=prefix + route
    const isMatched=$state(false)
   useComponent()
    runEffect(() => {
      // console.log('called',routes);
      if (!notfound) {
        if(!checkRoute(thisRoute)){
          setRoute(thisRoute,group,prefix)
        // console.log(context,thisRoute,group,prefix);
        }else{
        // console.log(contextRoute);
        }
        
      }
    },0)

    const guardCheck = () => {
        if (typeof guard === 'function') {
         return guard()
        } else {
          return guard
        }
    }

    useInsert({guardCheck,current,for404,isRoute,isMatched})
    if (notfound) {
      return `
    <template if='for404.value'>
      ${children}
    </template>
    `
    }else{
      return `
    <template if='isRoute.value.route === "${thisRoute}"' >
      ${children}
    </template>
    `
    }
}

const RouteLink=({href,children})=>{
  const {navigate}=useRouter()
  const ref=useRef()
  runEffect(()=>{
    const navi=(e)=>{
      e.preventDefault();
   navigate(href)
    }
    ref.value.addEventListener('click',navi)
    // console.log(context)
    return ()=>{
      ref.value.removeEventListener('click',navi)
    }
  })
  useInsert({ref})
  return `
  <a href="${href}" ref="ref" rel="noopener" aria-current="@{isRoute.value.current === '${href}' ? 'page' : false}">${children}</a>

  `
}


export function useRouter(){
  const {isRoute,routeParams} = useContext(routeContext)
  return {
    navigate: (path) => {
      history.pushState({}, '', path);
      isRoute.value.current = path;
      // console.log(isRoute);
      
      requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    },
    getParams:()=>routeParams.value
    
  }
}


export {Router,Route,RouteGroup,RouteLink,RoutePrefix}