'use strict';

var LIVERELOAD_PORT = 35729;
var lrSnippet = require('connect-livereload')({ port: LIVERELOAD_PORT });
var mountFolder = function (connect, dir) {
  return connect.static(require('path').resolve(dir));
};

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    headerDev: '/*! <%= pkg.name %> - v<%= pkg.version %>-dev-<%= grunt.template.today("yyyy-mm-dd") %>\n',
    headerRelease: '/*! <%= pkg.name %> - v<%= pkg.version %>\n',
    banner: '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    concat: {
      dev: {
        options: {
          banner: '<%= headerDev %><%= banner %>\n(function (window, angular, undefined) {\n',
          footer: '})(window, window.angular);\n',
          stripBanners: true
        },
        src: ['src/<%= pkg.name %>.js'],
        dest: 'dist/<%= pkg.name %>.js'
      },
      release: {
        options: {
          banner: '<%= headerRelease %><%= banner %>\n(function (window, angular, undefined) {\n',
          footer: '})(window, window.angular);\n',
          stripBanners: true
        },
        src: ['src/<%= pkg.name %>.js'],
        dest: 'release/<%= pkg.name %>.js'
      }
    },
    uglify: {
      dev: {
        options: {
          banner: '<%= headerDev %><%= banner %>'
        },
        src: '<%= concat.dev.dest %>',
        dest: 'dist/<%= pkg.name %>.min.js'
      },
      release: {
        options: {
          banner: '<%= headerRelease %><%= banner %>'
        },
        src: '<%= concat.release.dest %>',
        dest: 'release/<%= pkg.name %>.min.js'
      }
    },
    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      sources: {
        options: {
          jshintrc: 'src/.jshintrc'
        },
        src: ['src/**/*.js']
      },
      test: {
        src: ['test/**/*.js']
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      sources: {
        files: '<%= jshint.sources.src %>',
        tasks: ['jshint:sources', 'karma']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'karma']
      },
      sample: {
        options: {
          livereload: LIVERELOAD_PORT
        },
        tasks: 'copy:breadcrumb',
        files: [
          'sample/*.{css,js,html}',
          'sample/controllers/*.{css,js,html}',
          'sample/views/*.{css,js,html}',
          'src/*.js'
        ]
      }
    },
    copy: {
      breadcrumb: {
        files: [
          {
            flatten: true,
            expand: true,
            src: [
              'src/angular-breadcrumb.js'
            ],
            dest: 'sample/asset/'
          }
        ]
      },
      asset: {
        files: [
          {
            flatten: true,
            expand: true,
            src: [
              'dist/angular-breadcrumb.js',
              'bower_components/angular/angular.js',
              'bower_components/angular-ui-router/release/angular-ui-router.js',
              'bower_components/angular-ui-bootstrap-bower/ui-bootstrap-tpls.js',
              'bower_components/bootstrap.css/css/bootstrap.css',
              'bower_components/underscore/underscore.js'
            ],
            dest: 'sample/asset/'
          }
        ]
      },
      img: {
        files: [
          {
            flatten: true,
            expand: true,
            src: [
                'bower_components/bootstrap.css/img/glyphicons-halflings.png'
            ],
            dest: 'sample/img/'
          }
        ]
      }
    },
    connect: {
      options: {
        port: 9000,
        hostname: 'localhost'
      },
      livereload: {
        options: {
          middleware: function (connect) {
            return [
              lrSnippet,
              mountFolder(connect, 'sample')
            ];
          }
        }
      }
    },
    open: {
      server: {
        url: 'http://localhost:<%= connect.options.port %>/index.html'
      }
    },
    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        updateConfigs: ['pkg']
      }
    },
    clean: {
      release: ["sample/*.zip"]
    },
    compress: {
      release: {
        options: {
          archive: 'sample/<%= pkg.name %>-<%= pkg.version %>.zip'
        },
        files: [
          {expand: true, cwd: 'release/', src: ['*.js']}
        ]
      }
    },
    replace: {
      release: {
        src: ['sample/views/home.html'],
        overwrite: true,
        replacements: [{
            from: /angular-breadcrumb-[0-9]+\.[0-9]+\.[0-9]+\.zip/g,
            to: "angular-breadcrumb-<%= pkg.version %>.zip"
          },
          {
            from: /\([0-9]+\.[0-9]+\.[0-9]+\)/g,
            to: "(<%= pkg.version %>)"
          }]
      }
    }

  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-conventional-changelog');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-text-replace');

  grunt.registerTask('test', ['jshint', 'karma']);

  grunt.registerTask('default', ['test', 'concat:dev', 'uglify:dev']);

  grunt.registerTask('sample', ['concat:dev', 'copy:asset', 'copy:img', 'connect:livereload', 'open', 'watch']);

  grunt.registerTask('release-prepare', 'Update all files for a release', function(target) {
    if(!target) {
      target = 'patch';
    }
    grunt.task.run(
      'bump-only:' + target, // Version update
      'test', // Tests
      'concat:release', // Concat with release banner
      'uglify:release', // Minify with release banner
      'changelog', // Changelog update
      'clean:release', // Delete old version download file
      'compress:release', // New version download file
      'replace:release' // Update version in download button (link & label)
    );
  });

};
