/* Arma la agenda pública: data/eventos.json más las actividades Confirmadas o
   Realizadas de la planilla de Wailian (ver assets/planilla.js).
   Si la planilla no está configurada o falla, la agenda sigue funcionando solo
   con eventos.json. Así el sitio nunca se queda sin agenda. */
(function(){
  'use strict';

  function desdeJSON(){
    return fetch('data/eventos.json', {cache:'no-cache'})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); });
  }

  function desdePlanilla(){
    var P = window.XuexiPlanilla;
    if (!P || !P.configurada()) return Promise.resolve([]);
    return P.eventosPublicos().catch(function(err){
      console.warn('Agenda sin la planilla de Wailian, uso solo data/eventos.json:', err.message);
      return [];
    });
  }

  // Devuelve siempre {temporada, eventos}, venga de donde venga.
  window.cargarEventos = function(){
    return Promise.all([desdeJSON(), desdePlanilla()]).then(function(r){
      var datos = r[0], propios = datos.eventos || [];
      // Si una actividad ya está en eventos.json, manda esa: es la que tiene
      // fotos, lugar y textos revisados.
      var nuevos = r[1].filter(function(p){
        return !propios.some(function(e){ return window.XuexiPlanilla.mismaActividad(e, p); });
      });
      datos.eventos = propios.concat(nuevos);
      return datos;
    });
  };
})();
