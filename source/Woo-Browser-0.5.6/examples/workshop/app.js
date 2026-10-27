'use strict';
let tasks;try{tasks=JSON.parse(localStorage.getItem('tasks')||'[]');}catch{tasks=[];}if(!Array.isArray(tasks))tasks=[];
const list=document.getElementById('tasks');function render(){list.replaceChildren();for(const [i,t]of tasks.entries()){const li=document.createElement('li');li.textContent=t+' · click to complete';li.onclick=()=>{tasks.splice(i,1);save();};list.append(li);}}function save(){localStorage.setItem('tasks',JSON.stringify(tasks));render();}
document.getElementById('add').onsubmit=e=>{e.preventDefault();tasks.push(document.getElementById('task').value);document.getElementById('task').value='';save();};document.getElementById('identity').textContent='Browser origin: '+location.origin;render();
