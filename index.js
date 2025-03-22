import { state ,components, component,RegisterComponent} from "pawajs"
import { createEffect } from "pawajs/reactive.js"
export const validRoute=(...routes)=>{
  routes.forEach(r =>{
    allRoute.push(r)
  })
}

const allRoute=[]
const isValidRoute=state(null)
let currentRouteElement=document.createComment(`route`);
const isMatch = state( window.location.pathname)
let currentPath=null

// Add window location listener
window.addEventListener('popstate', () => {
    isMatch.value = window.location.pathname;
});

window.addEventListener('pushchange', () => {
    isMatch.value = window.location.pathname;
});

export const navigate = (path) => {
    window.history.pushState({}, '', path);
    // Dispatch custom event to notify route changes
    window.dispatchEvent(new CustomEvent('pushchange'));
    // Update global router state
    isMatch.value= path;
  }
  
  // For hash routing
//   export const hashNavigate = (path) => {
//     window.location.hash = path;
//     global.$hash = path;
//     window.dispatchEvent(new CustomEvent('pushchange')); 
//   }

 export const useParams=()=>{
  let searchParam={}
  const [match, params ] = matchRoute(currentPath, isMatch.value);
  const searchParams=new URLSearchParams(window.location.search)
    for (const [key,value] of searchParams.entries()){
      searchParam[key]=value
    }
   return {
    searchParams:searchParam,
    ...params
   };
  }
  export const startRouter=()=>{
    allRoute.forEach(r =>{
      const [match,params,path] = matchRoute(r,window.location.pathname)
      if (match === false && !allRoute.includes(path) ) {
        navigate('/404')
        isValidRoute.value=false
      }else{
        isValidRoute.value=true
        return
      }
    })
  }
const matchRoute = (pattern, path) => {
    try{
      // Remove trailing slashes for consistency
    const cleanPattern = pattern.replace(/\/$/, '');
    const cleanPath = path.replace(/\/$/, '');
    
    const patternParts = cleanPattern.split('/');
    const pathParts = cleanPath.split('/');
    
    if (patternParts.length !== pathParts.length) {
        
      return [ false,  {} , path];
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
    
    return [ match, params,path ];
    }catch(error){
      console.log(error + ' could not match the routes ' + pattern + ' at ',path)
    }
  }
  
  // Usage in router function
  const routeComponents = new Map()
  const router = (el, path, context, isMatch) => {
    context.navigate=navigate
      const parent=el.ParentElement
      const routeGuard = el.getAttribute('$route-guard');
      const routeFallback = el.getAttribute('$route-fallback') || '/';
      const fragment=document.createDocumentFragment()
      el.setAttribute('suspense','true')
      el.replaceWith(currentRouteElement);
      if(components.has(el.tagName)){
        //   fragment.appendChild(el)
          routeComponents.set(path, {
            element: el,
            component: el.tagName
        })

        }
        const evaluate = () => {
          const [match, params ] = matchRoute(path, isMatch.value);

          
          try {
              if (match) {
                  // Add params to context
                  
                  isValidRoute.value=true
                  currentPath=path
                  const routeContext = { ...context, params };
                  
                  if (routeGuard) {
                      const keys = Object.keys(routeContext);
                      const values = keys.map(key => routeContext[key]);
                      const guard = new Function(...keys, `return ${routeGuard}`)(...values);
                      
                      if (guard) {
                        const element=routeComponents.get(path)
                        currentRouteElement.replaceWith(element.element);
                       let newEle=component(element.element,context)
                        currentRouteElement=newEle
                        } else {
                            const element=document.createComment('<------route--->')
                          //   currentRouteElement.replaceWith(element);
                          // //  let newEle=component(element.element,context)
                          //   console.log(currentRouteElement)
                          //   currentRouteElement=element
                            navigate(routeFallback)
                        }
                    } else {
                      const element=routeComponents.get(path)
                      currentRouteElement.replaceWith(element.element);
                      let newEle=component(element.element,context)
                        currentRouteElement=newEle      
                    }
                } else {
                                  
              }
          } catch (error) {
              console.error('Route evaluation error:', error ,el);
          }
      };
  
      createEffect(() => {
          evaluate();
      });
  }

   const useAttriRoute = (attriPlugin, power) => {
    power['$route-navigate']=navigate
    const attribute = (el, attr, context) => {
    context.useRoute=useRoute
        if(attr.name === '$route') {
            router(el, attr.value, context, isMatch)
        }
    }
    attriPlugin.push(attribute)
  }
  export default useAttriRoute
 //router  
export const useRoute = (path=undefined) => {
  if(path === undefined || path === null){
    return {
    current:isMatch,
    validRoute:isValidRoute,
    }
  }else{
    return window.location.pathname === path ?true:false
  }

}
const props={
  to:{
    type:String,
    strict:true,
    msg:'to props must be a string in RouterLink'
  }
}

// router link
export const RouterLink = ({children,validateProps,insert,hook}) => {
  const {to}=validateProps(props)
  const ref={value:null}
  const isActive=()=>{
    return useRoute(to)
  }
  hook.mount(()=>{
    ref.value.addEventListener('click',(e)=>{
      e.preventDefault();
      navigate(to)
    })
  })
  insert({isActive,ref})
 return `
        <a rest="true" element="ref.value=el" href="${to}">${children}</a>
       `
};

RegisterComponent(RouterLink);
