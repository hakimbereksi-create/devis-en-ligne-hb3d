// en dehors de toute fonction, on crée une référence globale
var viewer;

$(document).ready(function() {

    var canvas = document.getElementById('cv');
    // on affecte à la variable globale
    viewer = new JSC3D.Viewer(canvas);

    viewer.setParameter('SceneUrl', 'dist/models/40mmcube.stl');
    viewer.setParameter('InitRotationX', 20);
    viewer.setParameter('InitRotationY', 20);
    viewer.setParameter('InitRotationZ', 0);
    viewer.setParameter('ModelColor', '#4082b8');
    viewer.setParameter('BackgroundColor1', '#FFFFFF');
    viewer.setParameter('BackgroundColor2', '#FFFFFF');
    viewer.setParameter('RenderMode', 'flat');
    viewer.setParameter('Definition', 'high');
    viewer.init();
    viewer.update();

    var ctx = canvas.getContext('2d');
    ctx.font = '12px Courier New';
    ctx.fillStyle = '#FF0000';

    // Boutons de mode de rendu
    const modeButtons = document.querySelectorAll('#viewer-modes button');

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode'); // 'flat' | 'wireframe' | 'point'
        viewer.setParameter('RenderMode', mode);
        viewer.update();

        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });


    //Function Definitions
    //====================================================================
    function loadModelByPath($path) {
        viewer.enableDefaultInputHandler(true);
        viewer.replaceSceneFromUrl($path);
        viewer.update();
    }


    //END Function Definitions
    //====================================================================


    // Handlers
    //=====================================================================
    viewer.afterupdate = function () {
//        var scene = viewer.getScene();
//        if (scene !== null && scene.getChildren().length > 0) {
//            //DEMO values !
//            ctx.fillText('Box (mm): 80 x 200 x 100', 10, 20);
//            ctx.fillText('Volume (cc): 10', 10, 35);
//            //
//        }
    };
    //END Handlers
    //====================================================================


    // Execution space
    //=====================================================================

    //Interaction Tip init and behavior
    $("#tip").hide();
    $("#info").mouseenter(function(){
        $("#tip").fadeIn();
    });
    $("#info").mouseleave(function(){
        $("#tip").fadeOut("slow");
    });

    // Ancien système de liens de rendu : plus utile si tu n'as plus de <a class="rendermode">
    // Tu peux le laisser commenté ou le supprimer complètement :
    /*
    $("a.rendermode").click(function(evt){
        $mode = $(this).attr("href").substr(1);
        viewer.setRenderMode($mode);
        viewer.update();
    });
    */

    // File loader
    $("#file").change(function(evt) {
        loadModelByPath(evt.target.files[0]);
    });
    //

});
