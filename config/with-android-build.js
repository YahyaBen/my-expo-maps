const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

/** Keep local Windows C++ builds below MAX_PATH and give Android lint enough metaspace. */
module.exports = function withAndroidBuild(config) {
  config = withGradleProperties(config, (config) => {
    const properties = config.modResults;
    const jvmArgs = properties.find(
      (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs',
    );
    const value = jvmArgs?.value ?? '-Xmx2048m';
    const metaspace = '-XX:MaxMetaspaceSize=1024m';
    const updated = /-XX:MaxMetaspaceSize=\S+/.test(value)
      ? value.replace(/-XX:MaxMetaspaceSize=\S+/, metaspace)
      : `${value} ${metaspace}`;

    if (jvmArgs) {
      jvmArgs.value = updated;
    } else {
      properties.push({ type: 'property', key: 'org.gradle.jvmargs', value: updated });
    }
    return config;
  });

  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('with-android-build requires the Expo Groovy app/build.gradle template.');
    }

    config.modResults.contents = mergeContents({
      src: config.modResults.contents,
      tag: 'windows-cmake-paths',
      anchor: /^android \{/m,
      offset: 1,
      comment: '//',
      newSrc: `    if (System.getProperty('os.name').toLowerCase().contains('windows')) {
        // Leave enough room for codegen target names and hashed object paths.
        externalNativeBuild {
            cmake {
                buildStagingDirectory file("$rootDir/../.cxx")
            }
        }
        defaultConfig {
            externalNativeBuild {
                cmake {
                    arguments "-DCMAKE_OBJECT_PATH_MAX=256"
                }
            }
        }
    }`,
    }).contents;
    return config;
  });
};
